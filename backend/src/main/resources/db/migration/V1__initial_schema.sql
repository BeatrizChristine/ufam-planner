CREATE TABLE app_user (
    id UUID PRIMARY KEY,
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_app_user_email UNIQUE (email),
    CONSTRAINT ck_app_user_status CHECK (status IN ('PENDING', 'ACTIVE', 'BLOCKED'))
);

CREATE TABLE course (
    id UUID PRIMARY KEY,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(180) NOT NULL,
    campus VARCHAR(120) NOT NULL,
    department VARCHAR(160),
    degree_type VARCHAR(40),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    source VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
    external_id VARCHAR(120),
    synced_at TIMESTAMPTZ,
    CONSTRAINT uq_course_code_campus UNIQUE (code, campus)
);

CREATE TABLE curriculum (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES course(id),
    code VARCHAR(60) NOT NULL,
    effective_from DATE,
    total_workload_hours INTEGER NOT NULL,
    expected_periods SMALLINT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_curriculum_course_code UNIQUE (course_id, code),
    CONSTRAINT ck_curriculum_workload CHECK (total_workload_hours > 0),
    CONSTRAINT ck_curriculum_periods CHECK (expected_periods > 0)
);

CREATE TABLE discipline (
    id UUID PRIMARY KEY,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(180) NOT NULL,
    workload_hours INTEGER NOT NULL,
    credits SMALLINT,
    department VARCHAR(160),
    syllabus TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    source VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
    external_id VARCHAR(120),
    synced_at TIMESTAMPTZ,
    CONSTRAINT uq_discipline_code UNIQUE (code),
    CONSTRAINT ck_discipline_workload CHECK (workload_hours > 0)
);

CREATE TABLE curriculum_component (
    id UUID PRIMARY KEY,
    curriculum_id UUID NOT NULL REFERENCES curriculum(id) ON DELETE CASCADE,
    discipline_id UUID NOT NULL REFERENCES discipline(id),
    suggested_period SMALLINT,
    component_type VARCHAR(24) NOT NULL,
    CONSTRAINT uq_curriculum_component UNIQUE (curriculum_id, discipline_id),
    CONSTRAINT ck_component_period CHECK (suggested_period IS NULL OR suggested_period > 0),
    CONSTRAINT ck_component_type CHECK (component_type IN ('MANDATORY', 'ELECTIVE', 'OPTIONAL'))
);

CREATE TABLE discipline_prerequisite (
    discipline_id UUID NOT NULL REFERENCES discipline(id) ON DELETE CASCADE,
    prerequisite_id UUID NOT NULL REFERENCES discipline(id),
    curriculum_id UUID NOT NULL REFERENCES curriculum(id) ON DELETE CASCADE,
    PRIMARY KEY (discipline_id, prerequisite_id, curriculum_id),
    CONSTRAINT ck_no_self_prerequisite CHECK (discipline_id <> prerequisite_id)
);

CREATE TABLE student_profile (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    curriculum_id UUID REFERENCES curriculum(id),
    registration_number VARCHAR(40),
    entry_period VARCHAR(16),
    expected_graduation_period VARCHAR(16),
    CONSTRAINT uq_student_profile_user UNIQUE (user_id),
    CONSTRAINT uq_student_registration UNIQUE (registration_number)
);

CREATE TABLE academic_progress (
    id UUID PRIMARY KEY,
    student_profile_id UUID NOT NULL REFERENCES student_profile(id) ON DELETE CASCADE,
    discipline_id UUID NOT NULL REFERENCES discipline(id),
    status VARCHAR(24) NOT NULL,
    final_grade NUMERIC(4,2),
    completed_at DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_progress_student_discipline UNIQUE (student_profile_id, discipline_id),
    CONSTRAINT ck_progress_status CHECK (status IN ('AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BLOCKED')),
    CONSTRAINT ck_progress_grade CHECK (final_grade IS NULL OR (final_grade >= 0 AND final_grade <= 10))
);

CREATE INDEX idx_curriculum_component_curriculum ON curriculum_component(curriculum_id);
CREATE INDEX idx_prerequisite_curriculum ON discipline_prerequisite(curriculum_id);
CREATE INDEX idx_progress_student_status ON academic_progress(student_profile_id, status);
CREATE INDEX idx_discipline_name ON discipline(name);

