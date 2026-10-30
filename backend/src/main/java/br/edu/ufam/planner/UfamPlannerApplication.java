package br.edu.ufam.planner;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class UfamPlannerApplication {

    public static void main(String[] args) {
        SpringApplication.run(UfamPlannerApplication.class, args);
    }
}

