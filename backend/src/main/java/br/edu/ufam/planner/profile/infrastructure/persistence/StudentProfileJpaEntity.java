package br.edu.ufam.planner.profile.infrastructure.persistence;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "student_profile")
class StudentProfileJpaEntity {

    @Id
    UUID id;

    @Column(name = "user_id", nullable = false)
    UUID userId;

    @Column(name = "course_id")
    UUID courseId;

    @Column(name = "curriculum_id")
    UUID curriculumId;

    @Column(name = "admission_year")
    Short admissionYear;

    @Column(name = "admission_term")
    Short admissionTerm;

    @Column(name = "registration_number", length = 40)
    String registrationNumber;

    @Column(name = "current_period")
    Short currentPeriod;

    @Column(name = "created_at", nullable = false)
    Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    Instant updatedAt;
}
