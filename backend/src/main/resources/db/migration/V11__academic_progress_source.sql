ALTER TABLE academic_progress
    ADD COLUMN source VARCHAR(24) NOT NULL DEFAULT 'MANUAL';

ALTER TABLE academic_progress
    ADD CONSTRAINT ck_academic_progress_source
    CHECK (source IN ('MANUAL', 'ECAMPUS_HISTORY'));
