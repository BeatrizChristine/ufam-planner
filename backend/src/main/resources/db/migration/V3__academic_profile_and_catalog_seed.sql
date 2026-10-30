ALTER TABLE student_profile
    ADD COLUMN course_id UUID REFERENCES course(id),
    ADD COLUMN admission_year SMALLINT,
    ADD COLUMN admission_term SMALLINT,
    ADD COLUMN current_period SMALLINT,
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE student_profile profile
SET course_id = curriculum.course_id
FROM curriculum
WHERE profile.curriculum_id = curriculum.id
  AND profile.course_id IS NULL;

ALTER TABLE student_profile
    ADD CONSTRAINT ck_student_admission_year
        CHECK (admission_year IS NULL OR admission_year BETWEEN 1909 AND 2100),
    ADD CONSTRAINT ck_student_admission_term
        CHECK (admission_term IS NULL OR admission_term IN (1, 2)),
    ADD CONSTRAINT ck_student_current_period
        CHECK (current_period IS NULL OR current_period BETWEEN 1 AND 20);

CREATE INDEX idx_student_profile_course ON student_profile(course_id);
CREATE INDEX idx_student_profile_curriculum ON student_profile(curriculum_id);

INSERT INTO course (
    id, code, name, campus, department, degree_type, active, source
) VALUES (
    '10000000-0000-0000-0000-000000000001',
    'FT05',
    'Engenharia da Computação',
    'Manaus',
    'Faculdade de Tecnologia',
    'Bacharelado',
    TRUE,
    'MANUAL'
) ON CONFLICT (code, campus) DO NOTHING;

INSERT INTO curriculum (
    id, course_id, code, effective_from, total_workload_hours, expected_periods, active
) VALUES (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'FT05-DEMO-2024',
    DATE '2024-01-01',
    3600,
    10,
    TRUE
) ON CONFLICT (course_id, code) DO NOTHING;

INSERT INTO discipline (id, code, name, workload_hours, credits, department, source) VALUES
    ('30000000-0000-0000-0000-000000000001', 'MAT001', 'Cálculo I', 60, 4, 'Departamento de Matemática', 'MANUAL'),
    ('30000000-0000-0000-0000-000000000002', 'ICC001', 'Introdução à Computação', 60, 4, 'Instituto de Computação', 'MANUAL'),
    ('30000000-0000-0000-0000-000000000003', 'ICC002', 'Algoritmos e Programação', 60, 4, 'Instituto de Computação', 'MANUAL'),
    ('30000000-0000-0000-0000-000000000004', 'MAT002', 'Cálculo II', 60, 4, 'Departamento de Matemática', 'MANUAL'),
    ('30000000-0000-0000-0000-000000000005', 'ICC003', 'Estruturas de Dados', 60, 4, 'Instituto de Computação', 'MANUAL'),
    ('30000000-0000-0000-0000-000000000006', 'ICC004', 'Arquitetura de Computadores', 60, 4, 'Instituto de Computação', 'MANUAL')
ON CONFLICT (code) DO NOTHING;

INSERT INTO curriculum_component (
    id, curriculum_id, discipline_id, suggested_period, component_type
) VALUES
    ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 1, 'MANDATORY'),
    ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 1, 'MANDATORY'),
    ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 2, 'MANDATORY'),
    ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 2, 'MANDATORY'),
    ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 3, 'MANDATORY'),
    ('40000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000006', 3, 'MANDATORY')
ON CONFLICT (curriculum_id, discipline_id) DO NOTHING;

INSERT INTO discipline_prerequisite (discipline_id, prerequisite_id, curriculum_id) VALUES
    ('30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'),
    ('30000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
    ('30000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
