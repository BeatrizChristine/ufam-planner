ALTER TABLE curriculum
    ADD COLUMN mandatory_workload_hours INTEGER,
    ADD COLUMN elective_workload_hours INTEGER,
    ADD COLUMN extension_workload_hours INTEGER;

ALTER TABLE curriculum
    ADD CONSTRAINT ck_curriculum_mandatory_workload
        CHECK (mandatory_workload_hours IS NULL OR mandatory_workload_hours >= 0),
    ADD CONSTRAINT ck_curriculum_elective_workload
        CHECK (elective_workload_hours IS NULL OR elective_workload_hours >= 0),
    ADD CONSTRAINT ck_curriculum_extension_workload
        CHECK (extension_workload_hours IS NULL OR extension_workload_hours >= 0),
    ADD CONSTRAINT ck_curriculum_workload_breakdown
        CHECK (
            mandatory_workload_hours IS NULL
            OR elective_workload_hours IS NULL
            OR extension_workload_hours IS NULL
            OR mandatory_workload_hours + elective_workload_hours + extension_workload_hours = total_workload_hours
        );

UPDATE curriculum
   SET mandatory_workload_hours = 3105,
       elective_workload_hours = 90,
       extension_workload_hours = 480
 WHERE id = '20000000-0000-0000-0000-000000000001';
