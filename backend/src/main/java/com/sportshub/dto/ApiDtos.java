package com.sportshub.dto;

import com.sportshub.domain.BookingItem.ItemType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class ApiDtos {
    private ApiDtos() {}

    public record CityDto(Long id, String name) {}

    public record SportDto(Long id, String name, String color, String icon) {}

    public record ParkCategoryDto(Long id, String name, String color, String icon) {}

    public record VenueDto(
        Long id,
        String sport,
        String name,
        String city,
        String sub,
        BigDecimal price,
        BigDecimal rating,
        List<String> tags,
        String address,
        String state,
        Double latitude,
        Double longitude
    ) {
        public VenueDto(Long id, String sport, String name, String city, String sub, BigDecimal price, BigDecimal rating, List<String> tags) {
            this(id, sport, name, city, sub, price, rating, tags, null, null, null, null);
        }
    }

    public record ParkDto(
        Long id,
        String cat,
        String name,
        String city,
        String area,
        BigDecimal price,
        List<String> tags,
        String address,
        String state,
        Double latitude,
        Double longitude
    ) {
        public ParkDto(Long id, String cat, String name, String city, String area, BigDecimal price, List<String> tags) {
            this(id, cat, name, city, area, price, tags, null, null, null, null);
        }
    }

    public record EventDto(
        Long id,
        String title,
        LocalDateTime startsAt,
        Integer capacity
    ) {}

    public record StadiumDto(
        Long id,
        String sport,
        String name,
        String city,
        String area,
        BigDecimal price,
        Integer capacity,
        BigDecimal rating,
        String image,
        List<String> tags,
        EventDto nextEvent,
        String address,
        String state,
        Double latitude,
        Double longitude
    ) {
        // Backwards-compatible constructors
        public StadiumDto(Long id, String sport, String name, String city, String area, BigDecimal price, Integer capacity, BigDecimal rating, String image, List<String> tags, EventDto nextEvent) {
            this(id, sport, name, city, area, price, capacity, rating, image, tags, nextEvent, null, null, null, null);
        }

        public StadiumDto(Long id, String sport, String name, String city, String area, BigDecimal price, List<String> tags, EventDto nextEvent) {
            this(id, sport, name, city, area, price, null, null, null, tags, nextEvent, null, null, null, null);
        }
    }

    public record StandDto(Long id, String name, BigDecimal mult) {}

    public record StadiumDetailsDto(
        StadiumDto stadium,
        List<EventDto> events,
        List<StandDto> stands
    ) {}

    public record StandAvailabilityDto(
        Long id,
        Long stadiumId,
        String name,
        BigDecimal priceMultiplier,
        BigDecimal price,
        int capacity,
        int bookedTickets,
        int availableTickets,
        String status
    ) {}

    public record StadiumCreateRequest(
        Long id,
        @NotBlank String name,
        Long cityId,
        String city,
        String area,
        String address,
        String state,
        Double latitude,
        Double longitude,
        Long sportId,
        @NotNull @PositiveOrZero BigDecimal basePrice,
        Integer capacity,
        BigDecimal rating,
        String image
    ) {}

    public record StadiumUpdateRequest(
        String name,
        Long cityId,
        String city,
        String area,
        String address,
        String state,
        Double latitude,
        Double longitude,
        Long sportId,
        BigDecimal basePrice,
        Integer capacity,
        BigDecimal rating,
        String image
    ) {}

    public record EventCreateRequest(
        @NotBlank String title,
        @NotNull LocalDateTime startsAt,
        Integer capacity
    ) {}

    public record EventUpdateRequest(
        String title,
        LocalDateTime startsAt,
        Integer capacity
    ) {}

    public record SlotDto(
        LocalDate date,
        int startHour,
        BigDecimal price,
        boolean booked,
        boolean past,
        boolean available
    ) {
        public SlotDto(LocalDate date, int startHour, BigDecimal price, boolean booked) {
            this(date, startHour, price, booked, false, !booked);
        }
    }

    public record Tickets(
        @Min(0) @Max(50) Integer adult,
        @Min(0) @Max(50) Integer child,
        @Min(0) @Max(50) Integer family,
        @Min(1) @Max(4) Integer famAdults,
        @Min(0) @Max(4) Integer famChildren,
        @Min(0) @Max(50) Integer picnic
    ) {}

    public record QuoteRequest(
        @NotNull ItemType itemType,
        @NotNull Long refId,
        Long eventId,
        Long standId,
        LocalDate visitDate,
        Integer startHour,
        @Valid Tickets tickets,
        String coupon,
        @Min(1) @Max(50) Integer splitCount,
        String customerName,
        String customerEmail,
        String customerPhone
    ) {
        public QuoteRequest {
            if (tickets == null && itemType == ItemType.SLOT) {
                tickets = new Tickets(1, 0, 0, 1, 0, 0);
            }
        }

        // Backwards-compatible constructor
        public QuoteRequest(ItemType itemType, Long refId, Long eventId, Long standId, LocalDate visitDate, Integer startHour, Tickets tickets, String coupon, Integer splitCount) {
            this(itemType, refId, eventId, standId, visitDate, startHour, tickets, coupon, splitCount, null, null, null);
        }
    }

    public record QuoteResponse(
        ItemType itemType,
        Long refId,
        BigDecimal linePrice,
        BigDecimal subtotal,
        BigDecimal discount,
        BigDecimal fee,
        BigDecimal total,
        BigDecimal perPerson,
        String couponMessage
    ) {}

    public record BookingLocationDto(
        Long bookingId,
        Long venueId,
        String venueName,
        String venueType,
        String address,
        String area,
        String city,
        String state,
        Double latitude,
        Double longitude,
        String googleMapsUrl,
        String directionsQuery
    ) {}

    public record HoldResponse(
        Long bookingId,
        String status,
        LocalDateTime holdExpiresAt,
        QuoteResponse quote,
        String ticketCode,
        String qrData,
        String qrImageUrl,
        BookingLocationDto location
    ) {
        // Backwards-compatible constructors
        public HoldResponse(Long bookingId, String status, LocalDateTime holdExpiresAt, QuoteResponse quote, String ticketCode, String qrData) {
            this(bookingId, status, holdExpiresAt, quote, ticketCode, qrData, "/api/bookings/" + bookingId + "/qr", null);
        }

        public HoldResponse(Long bookingId, String status, LocalDateTime holdExpiresAt, QuoteResponse quote) {
            this(bookingId, status, holdExpiresAt, quote, null, null, null, null);
        }
    }

    public record PaymentRequest(
        @NotNull Long bookingId,
        String paymentMethod,
        String upiApp,
        String upiId,
        String cardLast4,
        String cardNetwork,
        BigDecimal amount,
        Boolean simulateFailure,
        String failureReason
    ) {}

    public record PaymentResponse(
        boolean success,
        String transactionId,
        String utr,
        String paymentMethod,
        BigDecimal amount,
        LocalDateTime paidAt,
        String errorCode,
        String errorMessage,
        HoldResponse booking
    ) {}

    public record BookingItemDto(
        Long id,
        ItemType itemType,
        Long refId,
        Long eventId,
        Long standId,
        LocalDate visitDate,
        Integer startHour,
        Integer adults,
        Integer children,
        Integer familyPasses,
        Integer familyAdults,
        Integer familyChildren,
        Integer picnic,
        BigDecimal price,
        String eventName,
        String standName
    ) {
        public BookingItemDto(
            Long id,
            ItemType itemType,
            Long refId,
            Long eventId,
            Long standId,
            LocalDate visitDate,
            Integer startHour,
            Integer adults,
            Integer children,
            Integer familyPasses,
            Integer familyAdults,
            Integer familyChildren,
            Integer picnic,
            BigDecimal price
        ) {
            this(id, itemType, refId, eventId, standId, visitDate, startHour, adults, children, familyPasses, familyAdults, familyChildren, picnic, price, null, null);
        }
    }

    public record BookingDetailsDto(
        Long id,
        String status,
        String paymentStatus,
        LocalDateTime holdExpiresAt,
        BigDecimal subtotal,
        BigDecimal discount,
        BigDecimal fee,
        BigDecimal total,
        Integer splitCount,
        String customerName,
        String customerEmail,
        String customerPhone,
        String ticketCode,
        String qrData,
        Boolean qrUsed,
        LocalDateTime qrUsedAt,
        List<BookingItemDto> items,
        BookingLocationDto location,
        String qrImageUrl,
        String paymentReference,
        String transactionReference,
        String refundStatus,
        LocalDateTime refundEligibleUntil
    ) {
        // Backwards-compatible constructors
        public BookingDetailsDto(
            Long id,
            String status,
            String paymentStatus,
            LocalDateTime holdExpiresAt,
            BigDecimal subtotal,
            BigDecimal discount,
            BigDecimal fee,
            BigDecimal total,
            Integer splitCount,
            String customerName,
            String customerEmail,
            String customerPhone,
            String ticketCode,
            String qrData,
            Boolean qrUsed,
            LocalDateTime qrUsedAt,
            List<BookingItemDto> items,
            BookingLocationDto location,
            String qrImageUrl
        ) {
            this(id, status, paymentStatus, holdExpiresAt, subtotal, discount, fee, total, splitCount, customerName, customerEmail, customerPhone, ticketCode, qrData, qrUsed, qrUsedAt, items, location, qrImageUrl, null, null, null, null);
        }

        public BookingDetailsDto(
            Long id,
            String status,
            String paymentStatus,
            LocalDateTime holdExpiresAt,
            BigDecimal subtotal,
            BigDecimal discount,
            BigDecimal fee,
            BigDecimal total,
            Integer splitCount,
            String customerName,
            String customerEmail,
            String customerPhone,
            String ticketCode,
            String qrData,
            Boolean qrUsed,
            LocalDateTime qrUsedAt,
            List<BookingItemDto> items
        ) {
            this(id, status, paymentStatus, holdExpiresAt, subtotal, discount, fee, total, splitCount, customerName, customerEmail, customerPhone, ticketCode, qrData, qrUsed, qrUsedAt, items, null, "/api/bookings/" + id + "/qr", null, null, null, null);
        }
    }

    public record QrValidationRequest(
        String qrCode
    ) {}

    public record QrValidationResponse(
        boolean valid,
        String message,
        String ticketCode,
        Long bookingId,
        LocalDateTime scannedAt
    ) {}

    public record EventUpdateDto(
        Long id,
        String type,
        String title,
        String message,
        String timestamp,
        String severity
    ) {}

    public record ErrorResponse(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        String path
    ) {}
}
