package com.sportshub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SportsHubApplication {
    public static void main(String[] args) {
        SpringApplication.run(SportsHubApplication.class, args);
    }
}
