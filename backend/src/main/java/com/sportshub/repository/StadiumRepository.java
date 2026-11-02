package com.sportshub.repository;

import com.sportshub.domain.Stadium;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StadiumRepository extends JpaRepository<Stadium, Long> {
    List<Stadium> findByCityId(Long cityId);
    List<Stadium> findByCityIdAndSportId(Long cityId, Long sportId);
    List<Stadium> findByCityNameIgnoreCase(String cityName);
    List<Stadium> findByCityNameIgnoreCaseAndSportId(String cityName, Long sportId);
    Optional<Stadium> findByNameIgnoreCase(String name);
}
