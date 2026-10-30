CREATE TABLE external_sync_run (
    id UUID PRIMARY KEY,
    source VARCHAR(40) NOT NULL,
    resource VARCHAR(80) NOT NULL,
    status VARCHAR(24) NOT NULL,
    items_processed INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    error_message VARCHAR(500),
    CONSTRAINT ck_external_sync_status CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED')),
    CONSTRAINT ck_external_sync_items CHECK (items_processed >= 0)
);

CREATE INDEX idx_external_sync_source_resource
    ON external_sync_run(source, resource, started_at DESC);

CREATE TABLE ufam_curriculum_version (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    external_id VARCHAR(120) NOT NULL,
    code VARCHAR(60) NOT NULL,
    status VARCHAR(40),
    source VARCHAR(40) NOT NULL DEFAULT 'UFAM_ECAMPUS',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    synced_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_ufam_curriculum_external UNIQUE (source, external_id)
);

CREATE INDEX idx_ufam_curriculum_course ON ufam_curriculum_version(course_id);
