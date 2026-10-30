-- Align the elective catalog and its prerequisites with the public eCampus
-- report for FT05, curriculum 2009/1 (course 96, curriculum 1215).

DELETE FROM discipline_prerequisite relationship
USING curriculum_component component
 WHERE relationship.curriculum_id = '20000000-0000-0000-0000-000000000001'
   AND component.curriculum_id = relationship.curriculum_id
   AND component.component_type = 'ELECTIVE'
   AND (relationship.discipline_id = component.discipline_id
        OR relationship.prerequisite_id = component.discipline_id);

DELETE FROM curriculum_component
 WHERE curriculum_id = '20000000-0000-0000-0000-000000000001'
   AND component_type = 'ELECTIVE';

CREATE TEMPORARY TABLE ft05_elective_seed (
    code VARCHAR(32) NOT NULL,
    name VARCHAR(180) NOT NULL,
    workload_hours INTEGER NOT NULL
) ON COMMIT DROP;

INSERT INTO ft05_elective_seed (code, name, workload_hours) VALUES
    ('FTE008', 'Circuitos Elétricos II', 60),
    ('FTL018', 'Introdução à Robótica', 60),
    ('FTL029', 'Sistemas de Comunicações', 60),
    ('FTL051', 'Laboratório de Eletrônica Analógica II', 30),
    ('FTL059', 'Eletrônica Analógica II', 60),
    ('FTL094', 'Engenharia de Software RT', 60),
    ('FTL095', 'Laboratório de Engenharia de Software RT', 30),
    ('FTL096', 'Microcontroladores', 60),
    ('FTL097', 'Laboratório de Microcontroladores', 30),
    ('FTL098', 'Laboratório de Introdução à Robótica', 30),
    ('FTL099', 'Inteligência Artificial Aplicada', 60),
    ('FTL100', 'Sinais e Sistemas', 60),
    ('FTL102', 'Comunicação Ótica', 60),
    ('FTL103', 'Processamento Digital de Imagens', 60),
    ('FTL104', 'Empreendedorismo', 60),
    ('FTL114', 'Gestão de Qualidade', 75),
    ('FTL120', 'Comunicação sem Fio', 60),
    ('FTL217', 'Sistemas Embutidos', 60),
    ('IEC028', 'Compiladores', 75),
    ('IEC582', 'Linguagens de Programação', 75),
    ('IEC682', 'Engenharia de Software', 105),
    ('IET001', 'Fundamentos de Mecânica', 60),
    ('IET002', 'Física Experimental I', 30),
    ('IET011', 'Ondas, Fluidos e Calor', 60),
    ('IET012', 'Física Experimental II', 30),
    ('IET021', 'Eletricidade e Magnetismo', 60),
    ('IET022', 'Física Experimental III', 30),
    ('IHP123', 'Língua Brasileira de Sinais B', 60);

INSERT INTO discipline (
    id, code, name, workload_hours, active, source, external_id, synced_at
)
SELECT
    md5('ufam-ecampus:discipline:' || seed.code)::UUID,
    seed.code,
    seed.name,
    seed.workload_hours,
    TRUE,
    'UFAM_ECAMPUS',
    seed.code,
    TIMESTAMPTZ '2026-09-24 22:25:00-04'
FROM ft05_elective_seed seed
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    workload_hours = EXCLUDED.workload_hours,
    active = TRUE,
    source = EXCLUDED.source,
    external_id = EXCLUDED.external_id,
    synced_at = EXCLUDED.synced_at;

INSERT INTO curriculum_component (
    id, curriculum_id, discipline_id, suggested_period, component_type
)
SELECT
    md5('ft05-2009-1:component:' || seed.code)::UUID,
    '20000000-0000-0000-0000-000000000001',
    discipline.id,
    NULL,
    'ELECTIVE'
FROM ft05_elective_seed seed
JOIN discipline ON discipline.code = seed.code
ON CONFLICT (curriculum_id, discipline_id) DO UPDATE SET
    suggested_period = NULL,
    component_type = 'ELECTIVE';

CREATE TEMPORARY TABLE ft05_elective_prerequisite_seed (
    discipline_code VARCHAR(32) NOT NULL,
    prerequisite_code VARCHAR(32) NOT NULL
) ON COMMIT DROP;

INSERT INTO ft05_elective_prerequisite_seed (discipline_code, prerequisite_code) VALUES
    ('FTE008', 'FTE006'),
    ('FTL018', 'FTE029'),
    ('FTL029', 'FTL062'),
    ('FTL051', 'FTL026'),
    ('FTL059', 'FTL026'),
    ('FTL094', 'IEC087'),
    ('FTL095', 'IEC087'),
    ('FTL096', 'FTL065'),
    ('FTL097', 'FTL085'),
    ('FTL098', 'FTE029'),
    ('FTL102', 'FTL062'),
    ('FTL103', 'FTL062'),
    ('FTL103', 'IEC013'),
    ('FTL120', 'FTL085'),
    ('IEC028', 'IEC582'),
    ('IEC582', 'IEC087'),
    ('IEC682', 'IEC087');

INSERT INTO discipline_prerequisite (
    discipline_id, prerequisite_id, curriculum_id
)
SELECT
    discipline.id,
    prerequisite.id,
    '20000000-0000-0000-0000-000000000001'
FROM ft05_elective_prerequisite_seed seed
JOIN discipline ON discipline.code = seed.discipline_code
JOIN discipline prerequisite ON prerequisite.code = seed.prerequisite_code
ON CONFLICT DO NOTHING;

UPDATE curriculum_source_snapshot
   SET captured_at = TIMESTAMPTZ '2026-09-24 22:25:00-04',
       notes = 'Componentes obrigatórios, optativos e relações de pré-requisito conferidos no relatório público da matriz 1215 gerado pelo eCampus em 24/09/2026. O diagrama do CAECom é usado somente como referência visual.'
 WHERE curriculum_id = '20000000-0000-0000-0000-000000000001'
   AND source_url = 'https://ecampus.ufam.edu.br/ecampus/gradesCurriculares'
   AND source_version = '2009/1 · curso 96 · matriz 1215';
