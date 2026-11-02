package com.sportshub.controller;

import com.sportshub.dto.ApiDtos.*;
import com.sportshub.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    final BookingService s;

    public BookingController(BookingService s) {
        this.s = s;
    }

    @PostMapping("/hold")
    public HoldResponse hold(@Valid @RequestBody QuoteRequest q) {
        return s.hold(q);
    }

    @GetMapping("/my-bookings")
    public java.util.List<BookingDetailsDto> getMyBookings(
        @RequestParam(required = false) String email,
        @RequestParam(required = false) String phone,
        @RequestParam(required = false) Long customerId
    ) {
        return s.getMyBookings(email, phone, customerId);
    }

    @GetMapping("/{id}")
    public BookingDetailsDto getBooking(@PathVariable Long id) {
        return s.getBooking(id);
    }

    @GetMapping(value = "/{id}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getBookingQrImage(@PathVariable Long id) {
        byte[] image = s.generateQrImage(id, 280, 280);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, MediaType.IMAGE_PNG_VALUE)
            .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
            .body(image);
    }

    @GetMapping(value = "/{id}/qr/image", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getBookingQrImageAlias(@PathVariable Long id) {
        return getBookingQrImage(id);
    }

    @GetMapping("/{id}/location")
    public BookingLocationDto getBookingLocation(@PathVariable Long id) {
        return s.getBookingLocation(id);
    }

    @PostMapping("/{id}/confirm")
    public HoldResponse confirm(@PathVariable Long id) {
        return s.confirm(id);
    }

    @PostMapping("/{id}/cancel")
    public BookingDetailsDto cancel(@PathVariable Long id) {
        return s.cancel(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remove(@PathVariable Long id) {
        s.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/qr/validate")
    public QrValidationResponse validateQr(
        @PathVariable Long id,
        @RequestBody(required = false) QrValidationRequest req
    ) {
        String qrCode = req != null ? req.qrCode() : null;
        return s.validateQr(id, qrCode);
    }
}
