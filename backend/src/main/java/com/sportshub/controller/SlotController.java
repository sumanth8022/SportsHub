package com.sportshub.controller;

import com.sportshub.domain.BookingItem;
import com.sportshub.domain.SlotReservation;
import com.sportshub.dto.ApiDtos.*;
import com.sportshub.repository.SlotReservationRepository;
import com.sportshub.repository.VenueRepository;
import com.sportshub.service.CatalogService;
import com.sportshub.service.PricingService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/venues")
@Transactional(readOnly = true)
public class SlotController {

    private static final ZoneId ZONE_KOLKATA = ZoneId.of("Asia/Kolkata");

    final CatalogService catalogService;
    final VenueRepository venues;
    final SlotReservationRepository reservations;
    final PricingService pricing;

    public SlotController(
            CatalogService catalogService,
            VenueRepository v,
            SlotReservationRepository r,
            PricingService p) {
        this.catalogService = catalogService;
        venues = v;
        reservations = r;
        pricing = p;
    }

    @GetMapping("/{id}")
    public VenueDto getVenue(@PathVariable Long id) {
        return catalogService.venue(id);
    }

    @GetMapping("/{id}/slots")
    public List<SlotDto> slots(
            @PathVariable Long id,
            @RequestParam LocalDate date) {
        venues.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Venue not found: " + id));

        var booked = reservations.findAll()
                .stream()
                .filter(x -> x.getVenueId().equals(id) &&
                        x.getSlotDate().equals(date))
                .map(SlotReservation::getStartHour)
                .collect(Collectors.toSet());

        ZonedDateTime now = ZonedDateTime.now(ZONE_KOLKATA);
        LocalDate today = now.toLocalDate();
        LocalTime currentTime = now.toLocalTime();

        List<SlotDto> out = new ArrayList<>();

        for (int h = 6; h < 23; h++) {
            boolean isPast = date.isBefore(today) ||
                    (date.isEqual(today) && !currentTime.isBefore(LocalTime.of(h, 0)));
            boolean isReserved = booked.contains(h);
            boolean unavailable = isPast || isReserved;

            var q = new QuoteRequest(
                    BookingItem.ItemType.SLOT,
                    id,
                    null,
                    null,
                    date,
                    h,
                    new Tickets(1, 0, 0, 1, 0, 0),
                    null,
                    1);

            out.add(
                    new SlotDto(
                            date,
                            h,
                            pricing.quote(q).linePrice(),
                            isReserved,
                            isPast,
                            !unavailable));
        }

        return out;
    }
}
