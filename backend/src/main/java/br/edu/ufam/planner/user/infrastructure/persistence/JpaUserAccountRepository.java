package br.edu.ufam.planner.user.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;

import br.edu.ufam.planner.user.domain.UserAccount;
import br.edu.ufam.planner.user.domain.UserAccountRepository;
import org.springframework.stereotype.Repository;

@Repository
public class JpaUserAccountRepository implements UserAccountRepository {

    private final SpringDataUserRepository repository;

    public JpaUserAccountRepository(SpringDataUserRepository repository) {
        this.repository = repository;
    }

    @Override
    public UserAccount save(UserAccount account) {
        return toDomain(repository.save(toEntity(account)));
    }

    @Override
    public UserAccount saveAndFlush(UserAccount account) {
        return toDomain(repository.saveAndFlush(toEntity(account)));
    }

    @Override
    public Optional<UserAccount> findById(UUID id) {
        return repository.findById(id).map(JpaUserAccountRepository::toDomain);
    }

    @Override
    public Optional<UserAccount> findByEmailOrUsername(String identifier) {
        return repository.findByEmailIgnoreCaseOrUsernameIgnoreCase(identifier, identifier)
                .map(JpaUserAccountRepository::toDomain);
    }

    @Override
    public Optional<UserAccount> findByGoogleSubject(String subject) {
        return repository.findByGoogleSubject(subject).map(JpaUserAccountRepository::toDomain);
    }

    @Override
    public boolean existsByEmail(String email) {
        return repository.existsByEmailIgnoreCase(email);
    }

    @Override
    public boolean existsByUsername(String username) {
        return repository.existsByUsernameIgnoreCase(username);
    }

    private static UserJpaEntity toEntity(UserAccount source) {
        var target = new UserJpaEntity();
        target.id = source.id();
        target.fullName = source.fullName();
        target.username = source.username();
        target.email = source.email();
        target.passwordHash = source.passwordHash();
        target.role = source.role();
        target.status = source.status();
        target.emailVerified = source.emailVerified();
        target.googleSubject = source.googleSubject();
        target.createdAt = source.createdAt();
        target.updatedAt = source.updatedAt();
        target.lastLoginAt = source.lastLoginAt();
        return target;
    }

    private static UserAccount toDomain(UserJpaEntity source) {
        return new UserAccount(
                source.id,
                source.fullName,
                source.username,
                source.email,
                source.passwordHash,
                source.role,
                source.status,
                source.emailVerified,
                source.googleSubject,
                source.createdAt,
                source.updatedAt,
                source.lastLoginAt);
    }
}

