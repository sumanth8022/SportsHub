package com.sportshub.controller;

import com.sportshub.dto.ApiDtos.*;
import com.sportshub.service.CatalogService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
public class CatalogController {
    final CatalogService s;

    public CatalogController(CatalogService s) {
        this.s = s;
    }

    @GetMapping("/cities")
    public List<CityDto> cities() {
        return s.cities();
    }

    @GetMapping("/sports")
    public List<SportDto> sports() {
        return s.sports();
    }

    @GetMapping("/park-categories")
    public List<ParkCategoryDto> cats() {
        return s.parkCategories();
    }

    @GetMapping("/venues")
    public List<VenueDto> venues(@RequestParam(required = false) Long city, @RequestParam(required = false) Long sport) {
        return s.venues(city, sport);
    }

    @GetMapping("/parks")
    public List<ParkDto> parks(@RequestParam(required = false) Long city, @RequestParam(required = false) Long category) {
        return s.parks(city, category);
    }

    // Stadium Endpoints
    @GetMapping("/stadiums")
    public List<StadiumDto> stadiums(
        @RequestParam(required = false) String city,
        @RequestParam(required = false) Long sport
    ) {
        return s.stadiums(city, sport);
    }

    @GetMapping("/stadiums/{id}")
    public StadiumDetailsDto stadium(@PathVariable Long id) {
        return s.stadium(id);
    }

    @PostMapping("/stadiums")
    public StadiumDto createStadium(@Valid @RequestBody StadiumCreateRequest req) {
        return s.createStadium(req);
    }

    @PutMapping("/stadiums/{id}")
    public StadiumDto updateStadium(@PathVariable Long id, @Valid @RequestBody StadiumUpdateRequest req) {
        return s.updateStadium(id, req);
    }

    @DeleteMapping("/stadiums/{id}")
    public ResponseEntity<Void> deleteStadium(@PathVariable Long id) {
        s.deleteStadium(id);
        return ResponseEntity.noContent().build();
    }

    // Stadium Event Endpoints
    @GetMapping("/stadiums/{stadiumId}/events")
    public List<EventDto> getStadiumEvents(@PathVariable Long stadiumId) {
        return s.getEventsForStadium(stadiumId);
    }

    @GetMapping("/stadiums/{stadiumId}/events/{eventId}")
    public EventDto getStadiumEvent(@PathVariable Long stadiumId, @PathVariable Long eventId) {
        return s.getEvent(stadiumId, eventId);
    }

    @GetMapping("/stadium-events/{id}")
    public EventDto getEventById(@PathVariable Long id) {
        return s.getEventById(id);
    }

    @PostMapping("/stadiums/{stadiumId}/events")
    public EventDto createStadiumEvent(@PathVariable Long stadiumId, @Valid @RequestBody EventCreateRequest req) {
        return s.createEvent(stadiumId, req);
    }

    @PutMapping("/stadiums/{stadiumId}/events/{eventId}")
    public EventDto updateStadiumEvent(
        @PathVariable Long stadiumId,
        @PathVariable Long eventId,
        @Valid @RequestBody EventUpdateRequest req
    ) {
        return s.updateEvent(stadiumId, eventId, req);
    }

    @DeleteMapping("/stadiums/{stadiumId}/events/{eventId}")
    public ResponseEntity<Void> deleteStadiumEvent(
        @PathVariable Long stadiumId,
        @PathVariable Long eventId
    ) {
        s.deleteEvent(stadiumId, eventId);
        return ResponseEntity.noContent().build();
    }

    // Stand Availability Endpoints
    @GetMapping("/stadiums/{stadiumId}/stands")
    public List<StandAvailabilityDto> getStandAvailability(
        @PathVariable Long stadiumId,
        @RequestParam(required = false) Long eventId
    ) {
        return s.getStandAvailability(stadiumId, eventId);
    }

    @GetMapping("/stadiums/{stadiumId}/stands/{standId}/availability")
    public StandAvailabilityDto getSingleStandAvailability(
        @PathVariable Long stadiumId,
        @PathVariable Long standId,
        @RequestParam(required = false) Long eventId
    ) {
        return s.getSingleStandAvailability(stadiumId, standId, eventId);
    }
}
