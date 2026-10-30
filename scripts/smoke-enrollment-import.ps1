param(
    [Parameter(Mandatory = $true)]
    [string] $PdfPath,
    [string] $ApiBase = 'http://localhost:8080/api/v1'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$marker = [guid]::NewGuid().ToString('N').Substring(0, 10)
$testEmail = "import-check-$marker@example.invalid"
$testUserId = $null
$stage = 'cadastro'
$client = $null

try {
    $registration = @{
        name = 'Import Test'
        username = "check_$marker"
        email = $testEmail
        password = ([guid]::NewGuid().ToString('N') + 'A1!')
    } | ConvertTo-Json -Compress
    $session = Invoke-RestMethod -Uri "$ApiBase/auth/register" -Method Post `
        -ContentType 'application/json' -Body $registration
    $testUserId = $session.user.id
    $headers = @{ Authorization = "Bearer $($session.accessToken)" }

    $stage = 'perfil'
    $courses = Invoke-RestMethod -Uri "$ApiBase/catalog/courses" -Headers $headers
    $course = @($courses | Where-Object { $_.code -eq 'FT05' })[0]
    $curricula = Invoke-RestMethod -Uri "$ApiBase/catalog/courses/$($course.id)/curricula" -Headers $headers
    $curriculum = @($curricula | Where-Object { $_.code -match '2009' })[0]
    if (-not $course -or -not $curriculum) { throw 'Curso ou matriz FT05 indisponível.' }
    $directory = Invoke-RestMethod -Uri "$ApiBase/catalog/undergraduate-directory" -Headers $headers
    if ($directory.available) {
        $officialCourse = @($directory.courses | Where-Object { $_.code -eq 'FT05' })[0]
        if (-not $officialCourse -or $officialCourse.unitAbbreviation -ne 'FT' -or $course.unitAbbreviation -ne 'FT') {
            throw 'O diretório oficial não enriqueceu o curso FT05 corretamente.'
        }
        Write-Output "OK: diretório oficial com $($directory.courses.Count) cursos; FT05 vinculado à Faculdade de Tecnologia."
    } else {
        Write-Output 'Diretório temporariamente indisponível; o catálogo interno continua disponível.'
    }
    $profile = @{
        courseId = $course.id
        curriculumId = $curriculum.id
        admissionYear = 2023
        admissionTerm = 2
        registrationNumber = $null
        currentPeriod = 6
    } | ConvertTo-Json -Compress
    $null = Invoke-RestMethod -Uri "$ApiBase/academic-profile/me" -Method Put `
        -Headers $headers -ContentType 'application/json' -Body $profile

    $client = [System.Net.Http.HttpClient]::new()
    $client.DefaultRequestHeaders.Authorization =
        [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $session.accessToken)

    function Send-Pdf([string] $endpoint, [string] $selection) {
        $form = [System.Net.Http.MultipartFormDataContent]::new()
        $file = [System.Net.Http.ByteArrayContent]::new([IO.File]::ReadAllBytes($PdfPath))
        $file.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse('application/pdf')
        $form.Add($file, 'file', 'ComprovanteDeMatricula.pdf')
        if ($null -ne $selection) {
            $form.Add([System.Net.Http.StringContent]::new(
                $selection, [Text.Encoding]::UTF8, 'text/plain'), 'selection')
        }
        try {
            $response = $client.PostAsync("$ApiBase/study/import/enrollment/$endpoint", $form).GetAwaiter().GetResult()
            return @{
                status = [int] $response.StatusCode
                body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            }
        } finally { $form.Dispose() }
    }

    $stage = 'prévia'
    $response = Send-Pdf 'preview' $null
    if ($response.status -ne 200) { throw "HTTP $($response.status): $($response.body)" }
    $preview = $response.body | ConvertFrom-Json
    if ($preview.term -ne '2026/2' -or $preview.subjects.Count -lt 2) {
        throw 'Semestre ou disciplinas não identificados como esperado.'
    }
    $row = $preview.subjects[0]
    $choice = @{ code = $row.code; sectionLabel = $row.sectionLabel; name = $row.name; associateId = $null }
    $selection = ConvertTo-Json -InputObject @($choice) -Compress

    $stage = 'primeira confirmação'
    $response = Send-Pdf 'confirm' $selection
    if ($response.status -ne 200 -or ($response.body | ConvertFrom-Json).created -ne 1) {
        throw "Falha na criação: HTTP $($response.status): $($response.body)"
    }
    $subjects = Invoke-RestMethod -Uri "$ApiBase/study/me/subjects" -Headers $headers
    $subject = @($subjects | Where-Object { $_.code -eq $row.code -and $_.academicTerm -eq $preview.term })[0]
    if (-not $subject) { throw 'A disciplina importada não foi encontrada.' }
    if ($subject.inCurriculum -and ($subject.courseContext.relation -ne 'CURRICULUM' -or $subject.courseContext.code -ne 'FT05')) {
        throw 'O vínculo da disciplina com a matriz FT05 não foi identificado.'
    }
    if (-not $subject.inCurriculum -and $subject.courseContext) {
        throw 'O sistema atribuiu um curso ofertante sem confirmação.'
    }

    $stage = 'curso ofertante explícito'
    $manualInput = @{
        disciplineId = $null; code = 'SMOKE001'; name = 'Teste de curso ofertante'; workloadHours = 60
        offeringCourse = 'FT02-E · Engenharia Elétrica'; sectionLabel = 'TEST'; academicTerm = '2026/1'
        category = 'EXTERNAL_ELECTIVE'; status = 'PLANNED'; countAsElective = $false; meetings = @()
    } | ConvertTo-Json -Compress
    $offering = Invoke-RestMethod -Uri "$ApiBase/study/me/subjects" -Headers $headers -Method Post `
        -ContentType 'application/json' -Body $manualInput
    if ($offering.inCurriculum -or $offering.courseContext.relation -ne 'OFFERING') {
        throw 'Curso ofertante foi confundido com vínculo na matriz.'
    }
    if ($directory.available -and $offering.courseContext.code -ne 'FT02-E') {
        throw 'A variante do curso ofertante não foi preservada.'
    }
    $null = Invoke-RestMethod -Uri "$ApiBase/study/me/subjects/$($offering.id)" -Headers $headers -Method Delete

    $stage = 'preservação de faltas'
    $date = (Get-Date '2026-09-14').AddDays($row.meetings[0].weekday - 1).ToString('yyyy-MM-dd')
    $absence = @{ missedOn = $date; missedHours = 1; note = 'teste' } | ConvertTo-Json -Compress
    $null = Invoke-RestMethod -Uri "$ApiBase/study/me/subjects/$($subject.id)/absences" `
        -Headers $headers -Method Post -ContentType 'application/json' -Body $absence
    $response = Send-Pdf 'confirm' $selection
    if ($response.status -ne 200 -or ($response.body | ConvertFrom-Json).unchanged -ne 1) {
        throw "Reimportação não foi idempotente: HTTP $($response.status)"
    }

    $stage = 'proteção dos dados importados'
    foreach ($method in @('PUT', 'DELETE')) {
        $request = [System.Net.Http.HttpRequestMessage]::new(
            [System.Net.Http.HttpMethod]::new($method), "$ApiBase/study/me/subjects/$($subject.id)")
        if ($method -eq 'PUT') {
            $request.Content = [System.Net.Http.StringContent]::new('{}', [Text.Encoding]::UTF8, 'application/json')
        }
        try {
            $response = $client.SendAsync($request).GetAwaiter().GetResult()
            if ([int] $response.StatusCode -ne 409) {
                throw "A operação $method deveria ser bloqueada para dados importados."
            }
        } finally { $request.Dispose() }
    }

    $stage = 'rollback'
    $other = $preview.subjects[1]
    $invalidSelection = ConvertTo-Json -InputObject @(
        @{ code = $other.code; sectionLabel = $other.sectionLabel; name = $other.name; associateId = $null },
        @{ code = 'INVALID999'; sectionLabel = 'X'; name = 'Inválida'; associateId = $null }
    ) -Compress
    $response = Send-Pdf 'confirm' $invalidSelection
    if ($response.status -ne 400) { throw 'A seleção inválida não foi rejeitada.' }
    $subjects = @(Invoke-RestMethod -Uri "$ApiBase/study/me/subjects" -Headers $headers)
    $matches = @($subjects | Where-Object { $_.code -eq $row.code -and $_.academicTerm -eq $preview.term })
    $rolledBack = @($subjects | Where-Object { $_.code -eq $other.code -and $_.academicTerm -eq $preview.term })
    if ($matches.Length -ne 1 -or @($matches[0].absences).Length -ne 1 -or $rolledBack.Length -ne 0) {
        throw 'Duplicação, perda de faltas ou gravação parcial detectada.'
    }
    Write-Output "OK: $($preview.term), $($preview.subjects.Count) na prévia, dados importados protegidos, reimportação sem duplicar, falta preservada e lote inválido revertido."
} catch {
    Write-Error "Falha na etapa '$stage': $($_.Exception.Message)"
} finally {
    if ($client) { $client.Dispose() }
    if ($testUserId) {
        $sql = "DELETE FROM app_user WHERE id = '$testUserId' AND email = '$testEmail' AND full_name = 'Import Test';"
        & docker compose exec -T postgres psql -U ufam_planner -d ufam_planner -c $sql
    }
}
