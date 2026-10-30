package br.edu.ufam.planner.course.infrastructure.persistence;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "course")
class CourseJpaEntity {

    @Id
    UUID id;

    @Column(nullable = false, length = 32)
    String code;

    @Column(nullable = false, length = 180)
    String name;

    @Column(nullable = false, length = 120)
    String campus;

    @Column(name = "degree_type", length = 40)
    String degreeType;

    @Column(nullable = false)
    boolean active;
}
