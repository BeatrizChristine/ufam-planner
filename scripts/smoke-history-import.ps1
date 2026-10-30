param(
    [Parameter(Mandatory = $true)]
    [string] $PdfPath,
    [string] $ApiBase = 'http://localhost:8080/api/v1'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$marker = [guid]::NewGuid().ToString('N').Substring(0, 10)
$testEmail = "history-check-$marker@example.invalid"
$testUserId = $null
$stage = 'cadastro'
$client = $null

try {
    $registration = @{
        name = 'History Test'
        username = "history_$marker"
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
    $map = Invoke-RestMethod -Uri "$ApiBase/curricula/$($curriculum.id)/map" -Headers $headers

    $client = [System.Net.Http.HttpClient]::new()
    $client.DefaultRequestHeaders.Authorization =
        [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $session.accessToken)
    function Send-Pdf([string] $endpoint, [string] $selection) {
        $form = [System.Net.Http.MultipartFormDataContent]::new()
        $file = [System.Net.Http.ByteArrayContent]::new([IO.File]::ReadAllBytes($PdfPath))
        $file.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse('application/pdf')
        $form.Add($file, 'file', 'HistoricoEscolarAnalitico.pdf')
        if ($null -ne $selection) {
            $form.Add([System.Net.Http.StringContent]::new(
                $selection, [Text.Encoding]::UTF8, 'text/plain'), 'selection')
        }
        try {
            $response = $client.PostAsync("$ApiBase/study/import/history/$endpoint", $form).GetAwaiter().GetResult()
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
    $matrixCodes = @($map.components | ForEach-Object { $_.code })
    $mandatory = @($preview.completed | Where-Object {
        $_.category -eq 'MANDATORY' -and $matrixCodes -contains $_.code
    })[0]
    $external = @($preview.completed | Where-Object {
        $_.category -eq 'ELECTIVE' -and $matrixCodes -notcontains $_.code
    })[0]
    if (-not $mandatory -or -not $external) { throw 'Amostras obrigatória ou optativa externa ausentes.' }
    $selection = ConvertTo-Json -InputObject @(
        @{ code = $mandatory.code; name = $mandatory.name },
        @{ code = $external.code; name = $external.name }
    ) -Compress

    $stage = 'origem do progresso'
    $mandatoryComponent = @($map.components | Where-Object { $_.code -eq $mandatory.code })[0]
    $null = Invoke-RestMethod -Uri "$ApiBase/progress/me/disciplines/$($mandatoryComponent.disciplineId)" `
        -Method Put -Headers $headers -ContentType 'application/json' -Body '{"completed":true}'
    $manualProgress = Invoke-RestMethod -Uri "$ApiBase/progress/me/completed" -Headers $headers
    if ($manualProgress.completedCodes -contains $mandatory.code) {
        throw 'Uma marcação manual foi tratada como aprovação do histórico.'
    }

    $stage = 'confirmação'
    $response = Send-Pdf 'confirm' $selection
    if ($response.status -ne 200 -or ($response.body | ConvertFrom-Json).added -ne 2) {
        throw "Falha na confirmação: HTTP $($response.status): $($response.body)"
    }
    $stage = 'reimportação'
    $response = Send-Pdf 'confirm' $selection
    if ($response.status -ne 200 -or ($response.body | ConvertFrom-Json).unchanged -ne 2) {
        throw "Reimportação não foi idempotente: HTTP $($response.status)"
    }
    $progress = Invoke-RestMethod -Uri "$ApiBase/progress/me/completed" -Headers $headers
    $subjects = @(Invoke-RestMethod -Uri "$ApiBase/study/me/subjects" -Headers $headers)
    $externalMatches = @($subjects | Where-Object {
        $_.code -eq $external.code -and $_.category -eq 'EXTERNAL_ELECTIVE' -and $_.countAsElective
    })
    if ($progress.completedCodes -notcontains $mandatory.code -or $externalMatches.Length -ne 1) {
        throw 'Aprovação ou optativa externa não foi persistida corretamente.'
    }

    $stage = 'proteção do histórico'
    $null = Invoke-RestMethod -Uri "$ApiBase/progress/me/disciplines/$($mandatoryComponent.disciplineId)" `
        -Method Put -Headers $headers -ContentType 'application/json' -Body '{"completed":false}'
    $protectedProgress = Invoke-RestMethod -Uri "$ApiBase/progress/me/completed" -Headers $headers
    if ($protectedProgress.completedCodes -notcontains $mandatory.code) {
        throw 'Uma marcação manual apagou a aprovação importada do histórico.'
    }

    $stage = 'rollback'
    $other = @($preview.completed | Where-Object {
        $_.category -eq 'MANDATORY' -and $_.code -ne $mandatory.code -and $matrixCodes -contains $_.code
    })[0]
    $invalidSelection = ConvertTo-Json -InputObject @(
        @{ code = $other.code; name = $other.name },
        @{ code = 'INVALID999'; name = 'Inválida' }
    ) -Compress
    $response = Send-Pdf 'confirm' $invalidSelection
    if ($response.status -ne 400) { throw 'A seleção inválida não foi rejeitada.' }
    $progress = Invoke-RestMethod -Uri "$ApiBase/progress/me/completed" -Headers $headers
    if ($progress.completedCodes -contains $other.code) { throw 'O lote inválido gravou dados parcialmente.' }
    Write-Output "OK: $($preview.completed.Count) na prévia, aprovação e optativa externa salvas sem duplicar, lote inválido revertido."
} catch {
    Write-Error "Falha na etapa '$stage': $($_.Exception.Message)"
} finally {
    if ($client) { $client.Dispose() }
    if ($testUserId) {
        $sql = "DELETE FROM app_user WHERE id = '$testUserId' AND email = '$testEmail' AND full_name = 'History Test';"
        & docker compose exec -T postgres psql -U ufam_planner -d ufam_planner -c $sql
    }
}
