package com.sportshub.service;

import com.sportshub.domain.*;
import com.sportshub.dto.ApiDtos.*;
import com.sportshub.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class CatalogService {
    final CityRepository cities;
    final SportRepository sports;
    final ParkCategoryRepository cats;
    final VenueRepository venues;
    final ParkRepository parks;
    final StadiumRepository stadiums;
    final StadiumEventRepository events;
    final StandCategoryRepository stands;
    final BookingItemRepository bookingItems;

    public CatalogService(
        CityRepository cities,
        SportRepository sports,
        ParkCategoryRepository cats,
        VenueRepository venues,
        ParkRepository parks,
        StadiumRepository stadiums,
        StadiumEventRepository events,
        StandCategoryRepository stands,
        BookingItemRepository bookingItems
    ) {
        this.cities = cities;
        this.sports = sports;
        this.cats = cats;
        this.venues = venues;
        this.parks = parks;
        this.stadiums = stadiums;
        this.events = events;
        this.stands = stands;
        this.bookingItems = bookingItems;
    }

    public List<CityDto> cities() {
        return cities.findAll().stream().map(x -> new CityDto(x.getId(), x.getName())).toList();
    }

    public List<SportDto> sports() {
        return sports.findAll().stream().map(x -> new SportDto(x.getId(), x.getName(), x.getColor(), x.getIcon())).toList();
    }

    public List<ParkCategoryDto> parkCategories() {
        return cats.findAll().stream().map(x -> new ParkCategoryDto(x.getId(), x.getName(), x.getColor(), x.getIcon())).toList();
    }

    private List<String> tags(Set<Tag> s) {
        return s.stream().map(Tag::getName).sorted().toList();
    }

    public VenueDto dto(Venue v) {
        return new VenueDto(
            v.getId(),
            v.getSport().getName(),
            v.getName(),
            v.getCity().getName(),
            v.getSubArea(),
            v.getPricePerHour(),
            v.getRating(),
            tags(v.getTags()),
            v.getAddress(),
            v.getState(),
            v.getLatitude(),
            v.getLongitude()
        );
    }

    public VenueDto venue(Long id) {
        return venues.findById(id)
            .map(this::dto)
            .orElseThrow(() -> new NoSuchElementException("Venue not found: " + id));
    }

    public List<VenueDto> venues(Long city, Long sport) {
        var x = city == null ? venues.findAll() : (sport == null ? venues.findByCityId(city) : venues.findByCityIdAndSportId(city, sport));
        return x.stream().map(this::dto).toList();
    }

    public List<ParkDto> parks(Long city, Long cat) {
        var x = city == null ? parks.findAll() : (cat == null ? parks.findByCityId(city) : parks.findByCityIdAndCategoryId(city, cat));
        return x.stream().map(p -> new ParkDto(
            p.getId(),
            p.getCategory().getName(),
            p.getName(),
            p.getCity().getName(),
            p.getArea(),
            p.getBasePrice(),
            tags(p.getTags()),
            p.getAddress(),
            p.getState(),
            p.getLatitude(),
            p.getLongitude()
        )).toList();
    }

    public List<StadiumDto> stadiums(String cityFilter, Long sport) {
        if (cityFilter == null || cityFilter.isBlank()) {
            var list = sport == null ? stadiums.findAll() : stadiums.findAll().stream().filter(s -> s.getSport().getId().equals(sport)).toList();
            return list.stream().map(this::dto).toList();
        }

        String trimmed = cityFilter.trim();
        // Check if numeric city ID
        try {
            Long cityId = Long.parseLong(trimmed);
            var list = sport == null ? stadiums.findByCityId(cityId) : stadiums.findByCityIdAndSportId(cityId, sport);
            return list.stream().map(this::dto).toList();
        } catch (NumberFormatException ignored) {}

        // Resolve by city name
        var city = cities.findByNameIgnoreCase(trimmed)
            .orElseThrow(() -> new IllegalArgumentException("City not found: " + trimmed));

        var list = sport == null ? stadiums.findByCityId(city.getId()) : stadiums.findByCityIdAndSportId(city.getId(), sport);
        return list.stream().map(this::dto).toList();
    }

    public StadiumDto dto(Stadium s) {
        var next = events.findByStadiumIdOrderByStartsAtAsc(s.getId()).stream()
            .filter(e -> e.getStartsAt().isAfter(LocalDateTime.now()))
            .findFirst()
            .orElse(null);
        return new StadiumDto(
            s.getId(),
            s.getSport().getName(),
            s.getName(),
            s.getCity().getName(),
            s.getArea(),
            s.getBasePrice(),
            s.getCapacity(),
            s.getRating(),
            s.getImage(),
            tags(s.getTags()),
            next == null ? null : event(next),
            s.getAddress(),
            s.getState(),
            s.getLatitude(),
            s.getLongitude()
        );
    }

    public EventDto event(StadiumEvent e) {
        return new EventDto(e.getId(), e.getTitle(), e.getStartsAt(), e.getCapacity());
    }

    public StadiumDetailsDto stadium(Long id) {
        var s = stadiums.findById(id).orElseThrow(() -> new NoSuchElementException("Stadium not found: " + id));
        return new StadiumDetailsDto(
            dto(s),
            events.findByStadiumIdOrderByStartsAtAsc(id).stream().map(this::event).toList(),
            stands.findAll().stream().map(x -> new StandDto(x.getId(), x.getName(), x.getPriceMultiplier())).toList()
        );
    }

    @Transactional
    public StadiumDto createStadium(StadiumCreateRequest req) {
        if (req.name() == null || req.name().isBlank()) {
            throw new IllegalArgumentException("Stadium name is required.");
        }
        City city;
        if (req.cityId() != null) {
            city = cities.findById(req.cityId()).orElseThrow(() -> new IllegalArgumentException("City ID not found: " + req.cityId()));
        } else if (req.city() != null && !req.city().isBlank()) {
            city = cities.findByNameIgnoreCase(req.city().trim()).orElseThrow(() -> new IllegalArgumentException("City not found: " + req.city()));
        } else {
            throw new IllegalArgumentException("City is required.");
        }

        Sport sport = sports.findById(req.sportId() != null ? req.sportId() : 1L)
            .orElseThrow(() -> new IllegalArgumentException("Sport not found: " + req.sportId()));

        Long newId = req.id();
        if (newId == null) {
            newId = stadiums.findAll().stream().mapToLong(Stadium::getId).max().orElse(300L) + 1;
        }

        Stadium s = new Stadium();
        s.setId(newId);
        s.setName(req.name().trim());
        s.setCity(city);
        s.setSport(sport);
        s.setArea(req.area() != null ? req.area().trim() : city.getName());
        s.setAddress(req.address() != null ? req.address().trim() : (s.getArea() + ", " + city.getName()));
        s.setState(req.state() != null ? req.state().trim() : city.getName());
        s.setLatitude(req.latitude());
        s.setLongitude(req.longitude());
        s.setBasePrice(req.basePrice() != null ? req.basePrice() : BigDecimal.valueOf(800));
        s.setCapacity(req.capacity() != null ? req.capacity() : 40000);
        s.setRating(req.rating() != null ? req.rating() : BigDecimal.valueOf(4.7));
        s.setImage(req.image());

        stadiums.save(s);
        return dto(s);
    }

    @Transactional
    public StadiumDto updateStadium(Long id, StadiumUpdateRequest req) {
        Stadium s = stadiums.findById(id).orElseThrow(() -> new NoSuchElementException("Stadium not found: " + id));

        if (req.name() != null && !req.name().isBlank()) s.setName(req.name().trim());
        if (req.area() != null) s.setArea(req.area().trim());
        if (req.address() != null) s.setAddress(req.address().trim());
        if (req.state() != null) s.setState(req.state().trim());
        if (req.latitude() != null) s.setLatitude(req.latitude());
        if (req.longitude() != null) s.setLongitude(req.longitude());
        if (req.basePrice() != null) s.setBasePrice(req.basePrice());
        if (req.capacity() != null) s.setCapacity(req.capacity());
        if (req.rating() != null) s.setRating(req.rating());
        if (req.image() != null) s.setImage(req.image());
        if (req.cityId() != null) {
            City c = cities.findById(req.cityId()).orElseThrow(() -> new IllegalArgumentException("City ID not found: " + req.cityId()));
            s.setCity(c);
        } else if (req.city() != null && !req.city().isBlank()) {
            City c = cities.findByNameIgnoreCase(req.city().trim()).orElseThrow(() -> new IllegalArgumentException("City not found: " + req.city()));
            s.setCity(c);
        }
        if (req.sportId() != null) {
            Sport sp = sports.findById(req.sportId()).orElseThrow(() -> new IllegalArgumentException("Sport not found: " + req.sportId()));
            s.setSport(sp);
        }

        stadiums.save(s);
        return dto(s);
    }

    @Transactional
    public void deleteStadium(Long id) {
        Stadium s = stadiums.findById(id).orElseThrow(() -> new NoSuchElementException("Stadium not found: " + id));
        events.deleteByStadiumId(id);
        stadiums.delete(s);
    }

    public List<EventDto> getEventsForStadium(Long stadiumId) {
        stadiums.findById(stadiumId).orElseThrow(() -> new NoSuchElementException("Stadium not found: " + stadiumId));
        return events.findByStadiumIdOrderByStartsAtAsc(stadiumId).stream().map(this::event).toList();
    }

    public EventDto getEvent(Long stadiumId, Long eventId) {
        stadiums.findById(stadiumId).orElseThrow(() -> new NoSuchElementException("Stadium not found: " + stadiumId));
        StadiumEvent ev = events.findByIdAndStadiumId(eventId, stadiumId)
            .orElseThrow(() -> new NoSuchElementException("Event not found with ID " + eventId + " for stadium " + stadiumId));
        return event(ev);
    }

    public EventDto getEventById(Long eventId) {
        StadiumEvent ev = events.findById(eventId)
            .orElseThrow(() -> new NoSuchElementException("Event not found with ID " + eventId));
        return event(ev);
    }

    @Transactional
    public EventDto createEvent(Long stadiumId, EventCreateRequest req) {
        Stadium s = stadiums.findById(stadiumId).orElseThrow(() -> new NoSuchElementException("Stadium not found: " + stadiumId));
        if (req.title() == null || req.title().isBlank()) throw new IllegalArgumentException("Event title is required.");
        if (req.startsAt() == null) throw new IllegalArgumentException("Event startsAt is required.");

        StadiumEvent ev = new StadiumEvent();
        ev.setStadium(s);
        ev.setTitle(req.title().trim());
        ev.setStartsAt(req.startsAt());
        ev.setCapacity(req.capacity() != null ? req.capacity() : s.getCapacity());

        events.save(ev);
        return event(ev);
    }

    @Transactional
    public EventDto updateEvent(Long stadiumId, Long eventId, EventUpdateRequest req) {
        stadiums.findById(stadiumId).orElseThrow(() -> new NoSuchElementException("Stadium not found: " + stadiumId));
        StadiumEvent ev = events.findByIdAndStadiumId(eventId, stadiumId)
            .orElseThrow(() -> new NoSuchElementException("Event not found with ID " + eventId + " for stadium " + stadiumId));

        if (req.title() != null && !req.title().isBlank()) ev.setTitle(req.title().trim());
        if (req.startsAt() != null) ev.setStartsAt(req.startsAt());
        if (req.capacity() != null) ev.setCapacity(req.capacity());

        events.save(ev);
        return event(ev);
    }

    @Transactional
    public void deleteEvent(Long stadiumId, Long eventId) {
        stadiums.findById(stadiumId).orElseThrow(() -> new NoSuchElementException("Stadium not found: " + stadiumId));
        StadiumEvent ev = events.findByIdAndStadiumId(eventId, stadiumId)
            .orElseThrow(() -> new NoSuchElementException("Event not found with ID " + eventId + " for stadium " + stadiumId));
        events.delete(ev);
    }

    public List<StandAvailabilityDto> getStandAvailability(Long stadiumId, Long eventId) {
        Stadium s = stadiums.findById(stadiumId).orElseThrow(() -> new NoSuchElementException("Stadium not found: " + stadiumId));
        if (eventId != null) {
            events.findByIdAndStadiumId(eventId, stadiumId)
                .orElseThrow(() -> new IllegalArgumentException("Event ID " + eventId + " does not belong to stadium " + stadiumId));
        }

        List<StandCategory> allStands = stands.findAll();
        LocalDateTime now = LocalDateTime.now();

        return allStands.stream().map(st -> {
            int capacity = st.getCapacity() != null ? st.getCapacity() : 500;
            int booked = 0;
            if (eventId != null) {
                var activeItems = bookingItems.findActiveStadiumItems(eventId, st.getId(), now);
                booked = activeItems.stream().mapToInt(bi ->
                    n(bi.getAdults()) + n(bi.getChildren()) + n(bi.getFamilyPasses()) * (n(bi.getFamilyAdults()) + n(bi.getFamilyChildren()))
                ).sum();
            }
            int available = Math.max(0, capacity - booked);
            String status;
            if (available <= 0) {
                status = "SOLD_OUT";
            } else if (available <= Math.max(1, (int) Math.ceil(capacity * 0.15))) {
                status = "LIMITED";
            } else {
                status = "AVAILABLE";
            }
            BigDecimal price = s.getBasePrice().multiply(st.getPriceMultiplier()).setScale(0, RoundingMode.HALF_UP);
            return new StandAvailabilityDto(
                st.getId(),
                s.getId(),
                st.getName(),
                st.getPriceMultiplier(),
                price,
                capacity,
                booked,
                available,
                status
            );
        }).toList();
    }

    public StandAvailabilityDto getSingleStandAvailability(Long stadiumId, Long standId, Long eventId) {
        return getStandAvailability(stadiumId, eventId).stream()
            .filter(st -> st.id().equals(standId))
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Stand not found with ID " + standId + " for stadium " + stadiumId));
    }

    private int n(Integer val) {
        return val == null ? 0 : val;
    }
}
