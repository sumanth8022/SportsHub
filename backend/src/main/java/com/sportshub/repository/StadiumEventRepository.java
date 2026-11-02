package com.sportshub.repository;

import com.sportshub.domain.StadiumEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StadiumEventRepository extends JpaRepository<StadiumEvent, Long> {
    List<StadiumEvent> findByStadiumIdOrderByStartsAtAsc(Long stadiumId);
    Optional<StadiumEvent> findByIdAndStadiumId(Long id, Long stadiumId);
    void deleteByStadiumId(Long stadiumId);
}
