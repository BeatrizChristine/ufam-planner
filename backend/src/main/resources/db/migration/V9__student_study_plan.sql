CREATE TABLE study_subject (
    id UUID PRIMARY KEY,
    student_profile_id UUID NOT NULL REFERENCES student_profile(id) ON DELETE CASCADE,
    discipline_id UUID REFERENCES discipline(id),
    code VARCHAR(32) NOT NULL,
    name VARCHAR(180) NOT NULL,
    workload_hours INTEGER NOT NULL,
    offering_course VARCHAR(180),
    section_label VARCHAR(80),
    category VARCHAR(24) NOT NULL,
    status VARCHAR(24) NOT NULL,
    count_as_elective BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_study_subject_hours CHECK (workload_hours > 0 AND workload_hours <= 600),
    CONSTRAINT ck_study_subject_category CHECK (category IN ('MANDATORY', 'ELECTIVE', 'EXTERNAL_ELECTIVE')),
    CONSTRAINT ck_study_subject_status CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED')),
    CONSTRAINT ck_study_elective_credit CHECK (NOT count_as_elective OR category = 'EXTERNAL_ELECTIVE')
);

CREATE TABLE study_meeting (
    id UUID PRIMARY KEY,
    study_subject_id UUID NOT NULL REFERENCES study_subject(id) ON DELETE CASCADE,
    weekday SMALLINT NOT NULL,
    start_hour SMALLINT NOT NULL,
    end_hour SMALLINT NOT NULL,
    CONSTRAINT ck_study_meeting_weekday CHECK (weekday BETWEEN 1 AND 6),
    CONSTRAINT ck_study_meeting_time CHECK (start_hour IN (8, 10, 14, 16, 18, 20) AND end_hour = start_hour + 2),
    CONSTRAINT uq_study_meeting UNIQUE (study_subject_id, weekday, start_hour)
);

CREATE TABLE study_absence (
    id UUID PRIMARY KEY,
    study_subject_id UUID NOT NULL REFERENCES study_subject(id) ON DELETE CASCADE,
    missed_on DATE NOT NULL,
    missed_hours INTEGER NOT NULL,
    note VARCHAR(180),
    CONSTRAINT ck_study_absence_hours CHECK (missed_hours BETWEEN 1 AND 12)
);

CREATE INDEX idx_study_subject_profile ON study_subject(student_profile_id);
CREATE UNIQUE INDEX uq_study_external_elective_credit ON study_subject(student_profile_id, upper(code)) WHERE count_as_elective = true;
CREATE INDEX idx_study_absence_subject ON study_absence(study_subject_id);
