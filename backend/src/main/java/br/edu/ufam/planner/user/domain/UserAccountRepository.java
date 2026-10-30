package br.edu.ufam.planner.user.domain;

import java.util.Optional;
import java.util.UUID;

public interface UserAccountRepository {

    UserAccount save(UserAccount account);

    UserAccount saveAndFlush(UserAccount account);

    Optional<UserAccount> findById(UUID id);

    Optional<UserAccount> findByEmailOrUsername(String identifier);

    Optional<UserAccount> findByGoogleSubject(String subject);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);
}

