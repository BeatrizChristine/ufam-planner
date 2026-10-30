ALTER TABLE course ADD COLUMN ufam_level_id SMALLINT;
UPDATE course SET ufam_level_id = CASE campus
    WHEN 'Manaus' THEN 3
    WHEN 'Educação a Distância' THEN 13
    WHEN 'Coari' THEN 14
    WHEN 'Humaitá' THEN 15
    WHEN 'Benjamin Constant' THEN 16
    WHEN 'Itacoatiara' THEN 17
    WHEN 'Parintins' THEN 18
    WHEN 'PARFOR' THEN 20
    WHEN 'Graduação Indígena' THEN 22
END WHERE source = 'UFAM_ECAMPUS';

CREATE TABLE public_grade_course_sync (
    course_id UUID PRIMARY KEY REFERENCES course(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ,
    version_code VARCHAR(60),
    discipline_count INTEGER NOT NULL DEFAULT 0,
    error_message VARCHAR(500),
    CONSTRAINT ck_public_grade_course_sync_status CHECK (status IN ('SUCCESS', 'FAILED'))
);

CREATE TABLE public_grade_course_discipline (
    course_id UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    discipline_id UUID NOT NULL REFERENCES discipline(id) ON DELETE CASCADE,
    version_code VARCHAR(60) NOT NULL,
    PRIMARY KEY (course_id, discipline_id)
);

CREATE INDEX idx_public_grade_course_discipline_discipline
    ON public_grade_course_discipline (discipline_id);
