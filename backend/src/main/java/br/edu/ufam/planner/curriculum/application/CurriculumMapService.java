package br.edu.ufam.planner.curriculum.application;

import java.util.UUID;

import br.edu.ufam.planner.curriculum.domain.CurriculumMap;
import br.edu.ufam.planner.curriculum.domain.CurriculumMapRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CurriculumMapService {

    private final CurriculumMapRepository repository;

    public CurriculumMapService(CurriculumMapRepository repository) {
        this.repository = repository;
    }

    public CurriculumMap getById(UUID curriculumId) {
        return repository.findById(curriculumId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "A matriz curricular informada não foi encontrada."));
    }
}
