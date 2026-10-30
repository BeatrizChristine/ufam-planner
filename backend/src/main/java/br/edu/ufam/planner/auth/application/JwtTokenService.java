package br.edu.ufam.planner.auth.application;

import br.edu.ufam.planner.user.domain.UserAccount;

public interface JwtTokenService {

    AccessToken issue(UserAccount account);
}

