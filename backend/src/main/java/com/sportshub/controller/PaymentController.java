package com.sportshub.controller;

import com.sportshub.dto.ApiDtos.*;
import com.sportshub.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController("sportsHubPaymentController")
@RequestMapping("/api")
public class PaymentController {
    final BookingService bookingService;

    public PaymentController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping("/payments/process")
    public PaymentResponse process(@Valid @RequestBody PaymentRequest req) {
        String txnId = "TXN_SH_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        String utr = "UTR" + System.currentTimeMillis();
        String method = req.paymentMethod() != null ? req.paymentMethod() : "UPI";

        // Support simulated payment failure
        if (Boolean.TRUE.equals(req.simulateFailure())) {
            String errReason = req.failureReason() != null ? req.failureReason() : "Transaction declined by issuing bank (Insufficient funds).";
            return new PaymentResponse(
                false,
                txnId,
                utr,
                method,
                req.amount(),
                LocalDateTime.now(),
                "ERR_BANK_DECLINED",
                errReason,
                null
            );
        }

        HoldResponse confirmed = bookingService.confirm(req.bookingId());
        return new PaymentResponse(
            true,
            txnId,
            utr,
            method,
            req.amount() != null ? req.amount() : confirmed.quote().total(),
            LocalDateTime.now(),
            null,
            null,
            confirmed
        );
    }

    @GetMapping("/events/updates")
    public List<EventUpdateDto> getEventUpdates() {
        return List.of(
            new EventUpdateDto(1L, "schedule", "IPL Cricket Derby: Gates Open Early", "Turnstiles at Chinnaswamy Stadium will open 2 hours prior to kickoff. Mobile QR passes valid at all gates.", "10 mins ago", "info"),
            new EventUpdateDto(2L, "weather", "Pitch & Weather Advisory: Clear Skies", "Favorable playing conditions forecast for Bengaluru & Hyderabad outdoor turfs tonight (23°C, 8 km/h breeze).", "25 mins ago", "success"),
            new EventUpdateDto(3L, "venue", "Dink House Pickleball Upgraded", "Court 1 & Court 2 lighting has been upgraded to 500-lux tournament floodlights.", "1 hour ago", "info"),
            new EventUpdateDto(4L, "alert", "Stand Capacity Alert: Pavilion Lounge", "Only 12 tickets remaining for the weekend Mumbai Football derby in Pavilion Lounge.", "2 hours ago", "warning")
        );
    }
}
