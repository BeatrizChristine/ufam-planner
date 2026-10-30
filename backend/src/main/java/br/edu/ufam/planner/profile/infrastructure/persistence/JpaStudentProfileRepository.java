package br.edu.ufam.planner.profile.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;

import br.edu.ufam.planner.profile.domain.StudentProfile;
import br.edu.ufam.planner.profile.domain.StudentProfileRepository;
import org.springframework.stereotype.Repository;

@Repository
public class JpaStudentProfileRepository implements StudentProfileRepository {

    private final SpringDataStudentProfileRepository repository;

    public JpaStudentProfileRepository(SpringDataStudentProfileRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<StudentProfile> findByUserId(UUID userId) {
        return repository.findByUserId(userId).map(JpaStudentProfileRepository::toDomain);
    }

    @Override
    public StudentProfile save(StudentProfile profile) {
        return toDomain(repository.save(toEntity(profile)));
    }

    private static StudentProfileJpaEntity toEntity(StudentProfile source) {
        var target = new StudentProfileJpaEntity();
        target.id = source.id();
        target.userId = source.userId();
        target.courseId = source.courseId();
        target.curriculumId = source.curriculumId();
        target.admissionYear = toShort(source.admissionYear());
        target.admissionTerm = toShort(source.admissionTerm());
        target.registrationNumber = source.registrationNumber();
        target.currentPeriod = toShort(source.currentPeriod());
        target.createdAt = source.createdAt();
        target.updatedAt = source.updatedAt();
        return target;
    }

    private static StudentProfile toDomain(StudentProfileJpaEntity source) {
        return new StudentProfile(
                source.id,
                source.userId,
                source.courseId,
                source.curriculumId,
                toInteger(source.admissionYear),
                toInteger(source.admissionTerm),
                source.registrationNumber,
                toInteger(source.currentPeriod),
                source.createdAt,
                source.updatedAt);
    }

    private static Short toShort(Integer value) {
        return value == null ? null : value.shortValue();
    }

    private static Integer toInteger(Short value) {
        return value == null ? null : value.intValue();
    }
}
