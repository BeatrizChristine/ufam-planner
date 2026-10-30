package br.edu.ufam.planner.curriculum.presentation;

import java.util.UUID;

import br.edu.ufam.planner.curriculum.application.CurriculumMapService;
import br.edu.ufam.planner.curriculum.domain.CurriculumMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/curricula")
public class CurriculumMapController {

    private final CurriculumMapService service;

    public CurriculumMapController(CurriculumMapService service) {
        this.service = service;
    }

    @GetMapping("/{curriculumId}/map")
    public CurriculumMap getMap(@PathVariable UUID curriculumId) {
        return service.getById(curriculumId);
    }
}
