ALTER TABLE study_subject
    ADD COLUMN academic_term VARCHAR(6),
    ADD COLUMN source VARCHAR(32) NOT NULL DEFAULT 'MANUAL';

ALTER TABLE study_subject
    ADD CONSTRAINT ck_study_subject_academic_term
    CHECK (academic_term IS NULL OR academic_term ~ '^20[0-9]{2}/[12]$');

CREATE UNIQUE INDEX uq_study_subject_term_section
    ON study_subject (student_profile_id, academic_term, upper(code), upper(section_label))
    WHERE academic_term IS NOT NULL AND section_label IS NOT NULL;

CREATE INDEX idx_study_subject_profile_term
    ON study_subject (student_profile_id, academic_term);
