CREATE TABLE curriculum_source_snapshot (
    id UUID PRIMARY KEY,
    curriculum_id UUID NOT NULL REFERENCES curriculum(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    source_title VARCHAR(200) NOT NULL,
    source_version VARCHAR(80),
    published_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ NOT NULL,
    trust_status VARCHAR(24) NOT NULL,
    prerequisite_data_available BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    CONSTRAINT uq_curriculum_source_version UNIQUE (curriculum_id, source_url, source_version),
    CONSTRAINT ck_curriculum_source_trust CHECK (trust_status IN ('OFFICIAL', 'VALIDATED', 'DRAFT'))
);

CREATE INDEX idx_curriculum_source_curriculum
    ON curriculum_source_snapshot(curriculum_id);

-- Keep the original curriculum id so profiles created while the prototype used
-- the demo matrix remain linked after the official snapshot is published.
UPDATE course
   SET name = 'Engenharia da Computação',
       department = 'Faculdade de Tecnologia',
       degree_type = 'Bacharelado',
       active = TRUE
 WHERE id = '10000000-0000-0000-0000-000000000001';

UPDATE curriculum
   SET code = 'FT05-2009-1',
       effective_from = DATE '2009-01-01',
       total_workload_hours = 3675,
       expected_periods = 10,
       active = TRUE
 WHERE id = '20000000-0000-0000-0000-000000000001';

DELETE FROM discipline_prerequisite
 WHERE curriculum_id = '20000000-0000-0000-0000-000000000001';

DELETE FROM curriculum_component
 WHERE curriculum_id = '20000000-0000-0000-0000-000000000001';

CREATE TEMPORARY TABLE ft05_official_component_seed (
    code VARCHAR(32) NOT NULL,
    name VARCHAR(180) NOT NULL,
    workload_hours INTEGER NOT NULL,
    suggested_period SMALLINT NOT NULL,
    component_type VARCHAR(24) NOT NULL
) ON COMMIT DROP;

INSERT INTO ft05_official_component_seed (
    code, name, workload_hours, suggested_period, component_type
) VALUES
    ('IEC011', 'Introdução à Computação', 90, 1, 'MANDATORY'),
    ('IEF028', 'Física I E', 60, 1, 'MANDATORY'),
    ('IEF029', 'Laboratório de Física I E', 30, 1, 'MANDATORY'),
    ('IEM011', 'Cálculo I', 90, 1, 'MANDATORY'),
    ('IEM012', 'Álgebra Linear I', 60, 1, 'MANDATORY'),
    ('IHE030', 'Inglês Instrumental I', 75, 1, 'MANDATORY'),

    ('IEC012', 'Algoritmos e Estrutura de Dados I', 90, 2, 'MANDATORY'),
    ('IEE001', 'Probabilidade e Estatística', 60, 2, 'MANDATORY'),
    ('IEF038', 'Física II E', 60, 2, 'MANDATORY'),
    ('IEF039', 'Laboratório de Física II E', 30, 2, 'MANDATORY'),
    ('IEM021', 'Cálculo II', 90, 2, 'MANDATORY'),
    ('IEM022', 'Álgebra Linear II', 60, 2, 'MANDATORY'),
    ('IHP164', 'Português Instrumental', 60, 2, 'MANDATORY'),

    ('FTE006', 'Circuitos Elétricos I E', 60, 3, 'MANDATORY'),
    ('FTE007', 'Laboratório de Circuitos Elétricos I E', 30, 3, 'MANDATORY'),
    ('IEC010', 'Matemática Discreta', 60, 3, 'MANDATORY'),
    ('IEC030', 'Metodologia Científica na Ciência da Computação', 30, 3, 'MANDATORY'),
    ('IEF030', 'Física III E', 60, 3, 'MANDATORY'),
    ('IEF049', 'Laboratório de Física III E', 30, 3, 'MANDATORY'),
    ('IEM708', 'Equações Diferenciais Ordinárias', 90, 3, 'MANDATORY'),

    ('FAE011', 'Introdução à Economia', 75, 4, 'MANDATORY'),
    ('FTL022', 'Eletrônica Digital I', 60, 4, 'MANDATORY'),
    ('FTL023', 'Sinais e Sistemas', 60, 4, 'MANDATORY'),
    ('FTL026', 'Eletrônica Analógica I', 60, 4, 'MANDATORY'),
    ('FTL041', 'Laboratório de Eletrônica Analógica I', 30, 4, 'MANDATORY'),
    ('IEC087', 'Linguagens Formais e Autômatos', 60, 4, 'MANDATORY'),
    ('IEE312', 'Inferência Estatística I', 60, 4, 'MANDATORY'),

    ('FTE032', 'Conversão de Energia I', 60, 5, 'MANDATORY'),
    ('FTE052', 'Laboratório de Conversão de Energia I', 30, 5, 'MANDATORY'),
    ('FTL042', 'Eletrônica Digital II', 60, 5, 'MANDATORY'),
    ('FTL044', 'Laboratório de Eletrônica Digital II', 30, 5, 'MANDATORY'),
    ('FTL052', 'Processamento Digital de Sinais', 60, 5, 'MANDATORY'),
    ('IEC481', 'Projeto de Programas', 90, 5, 'MANDATORY'),
    ('IEC584', 'Sistemas Operacionais', 105, 5, 'MANDATORY'),
    ('IEC590', 'Sistemas de Eventos Discretos', 60, 5, 'MANDATORY'),

    ('FTE029', 'Sistemas de Controle', 60, 6, 'MANDATORY'),
    ('FTE030', 'Laboratório de Sistemas de Controle', 30, 6, 'MANDATORY'),
    ('FTL062', 'Princípios de Comunicações Digitais', 60, 6, 'MANDATORY'),
    ('FTL065', 'Arquitetura de Sistemas Digitais', 60, 6, 'MANDATORY'),
    ('FTL066', 'Programação em Tempo Real', 60, 6, 'MANDATORY'),
    ('FTL067', 'Laboratório de Arquitetura de Sistemas Digitais', 30, 6, 'MANDATORY'),
    ('FTL085', 'Redes de Computadores', 90, 6, 'MANDATORY'),

    ('FAA011', 'Introdução à Administração', 60, 7, 'MANDATORY'),
    ('IEC029', 'Sistemas Distribuídos', 60, 7, 'MANDATORY'),
    ('IEC034', 'Inteligência Artificial', 60, 7, 'MANDATORY'),

    ('FAA018', 'Organização Industrial I', 60, 8, 'MANDATORY'),
    ('FTL068', 'Projeto Final de Curso I', 60, 8, 'MANDATORY'),
    ('IHS041', 'Sociologia do Trabalho', 60, 8, 'MANDATORY'),

    ('FTL069', 'Projeto Final de Curso II', 60, 9, 'MANDATORY'),
    ('FTL216', 'Estágio Supervisionado', 180, 9, 'MANDATORY'),

    ('FTE008', 'Circuitos Elétricos II', 60, 4, 'ELECTIVE'),
    ('FTL059', 'Eletrônica Analógica II', 60, 5, 'ELECTIVE'),
    ('FTL051', 'Laboratório de Eletrônica Analógica II', 30, 5, 'ELECTIVE'),
    ('FTL094', 'Engenharia de Software Real-Time', 60, 6, 'ELECTIVE'),
    ('FTL095', 'Laboratório de Engenharia de Software Real-Time', 30, 6, 'ELECTIVE'),
    ('IEC682', 'Engenharia de Software', 105, 6, 'ELECTIVE'),
    ('FTL018', 'Introdução à Robótica', 60, 7, 'ELECTIVE'),
    ('FTL029', 'Sistemas de Telecomunicações', 60, 7, 'ELECTIVE'),
    ('FTL096', 'Microcontroladores', 60, 7, 'ELECTIVE'),
    ('FTL097', 'Laboratório de Microcontroladores', 30, 7, 'ELECTIVE'),
    ('FTL098', 'Laboratório de Introdução à Robótica', 30, 7, 'ELECTIVE'),
    ('IEC582', 'Linguagem de Programação', 75, 7, 'ELECTIVE'),
    ('FTL099', 'Inteligência Artificial Aplicada', 60, 8, 'ELECTIVE'),
    ('FTL101', 'Comunicação sem Fio', 60, 8, 'ELECTIVE'),
    ('FTL102', 'Comunicação Óptica', 60, 8, 'ELECTIVE'),
    ('FTL103', 'Processamento Digital de Imagens', 60, 8, 'ELECTIVE'),
    ('FTL114', 'Gestão da Qualidade', 75, 8, 'ELECTIVE'),
    ('FTL217', 'Sistemas Embutidos', 60, 8, 'ELECTIVE'),
    ('IEC028', 'Compiladores', 75, 8, 'ELECTIVE'),
    ('FTL104', 'Empreendedorismo', 60, 9, 'ELECTIVE');

INSERT INTO discipline (
    id, code, name, workload_hours, active, source, external_id, synced_at
)
SELECT
    md5('ufam-feec:discipline:' || seed.code)::UUID,
    seed.code,
    seed.name,
    seed.workload_hours,
    TRUE,
    'UFAM_FEEC',
    seed.code,
    TIMESTAMPTZ '2026-08-27 11:46:00-04'
FROM ft05_official_component_seed seed
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
    seed.suggested_period,
    seed.component_type
FROM ft05_official_component_seed seed
JOIN discipline ON discipline.code = seed.code
ON CONFLICT (curriculum_id, discipline_id) DO UPDATE SET
    suggested_period = EXCLUDED.suggested_period,
    component_type = EXCLUDED.component_type;

INSERT INTO curriculum_source_snapshot (
    id,
    curriculum_id,
    source_url,
    source_title,
    source_version,
    published_at,
    captured_at,
    trust_status,
    prerequisite_data_available,
    notes
) VALUES (
    '50000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'https://feec.ufam.edu.br/engenharia-da-computacao.html',
    'Engenharia da Computação — Faculdade de Engenharia Elétrica e Computação',
    '2009/1',
    TIMESTAMPTZ '2026-08-27 11:46:00-04',
    TIMESTAMPTZ '2026-09-24 00:00:00-04',
    'OFFICIAL',
    FALSE,
    'A página oficial publica componentes, períodos sugeridos e cargas horárias. Ela não publica as relações de pré-requisito; por isso nenhuma relação foi inferida.'
) ON CONFLICT (curriculum_id, source_url, source_version) DO UPDATE SET
    source_title = EXCLUDED.source_title,
    published_at = EXCLUDED.published_at,
    captured_at = EXCLUDED.captured_at,
    trust_status = EXCLUDED.trust_status,
    prerequisite_data_available = EXCLUDED.prerequisite_data_available,
    notes = EXCLUDED.notes;
