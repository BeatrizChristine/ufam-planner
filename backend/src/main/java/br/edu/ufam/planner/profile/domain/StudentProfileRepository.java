package br.edu.ufam.planner.profile.domain;

import java.util.Optional;
import java.util.UUID;

public interface StudentProfileRepository {

    Optional<StudentProfile> findByUserId(UUID userId);

    StudentProfile save(StudentProfile profile);
}
