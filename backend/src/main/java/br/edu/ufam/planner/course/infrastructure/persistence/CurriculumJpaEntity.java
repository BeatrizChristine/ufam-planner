package br.edu.ufam.planner.course.infrastructure.persistence;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "curriculum")
class CurriculumJpaEntity {

    @Id
    UUID id;

    @Column(name = "course_id", nullable = false)
    UUID courseId;

    @Column(nullable = false, length = 60)
    String code;

    @Column(name = "effective_from")
    LocalDate effectiveFrom;

    @Column(name = "total_workload_hours", nullable = false)
    int totalWorkloadHours;

    @Column(name = "expected_periods", nullable = false)
    short expectedPeriods;

    @Column(nullable = false)
    boolean active;
}
