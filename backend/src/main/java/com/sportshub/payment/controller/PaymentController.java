package com.sportshub.payment.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import jakarta.servlet.http.HttpServletRequest;


import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.sportshub.domain.Booking;
import com.sportshub.payment.entity.Customer;
import com.sportshub.payment.entity.Payment;
import com.sportshub.payment.repository.CustomerRepository;
import com.sportshub.payment.repository.PaymentRepository;
import com.sportshub.payment.service.PaymentReceiptService;
import com.sportshub.payment.service.PaymentService;
import com.sportshub.repository.BookingRepository;
import com.sportshub.service.BookingService;

@RestController("payflowPaymentController")
@CrossOrigin(
        origins = {
                "http://localhost:5173",
                "http://localhost:4173"
        }
)
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;
    private final PaymentReceiptService paymentReceiptService;
    private final BookingService bookingService;
    private final BookingRepository bookingRepository;

    public PaymentController(
            PaymentService paymentService,
            PaymentRepository paymentRepository,
            CustomerRepository customerRepository,
            PaymentReceiptService paymentReceiptService,
            BookingService bookingService,
            BookingRepository bookingRepository) {

        this.paymentService = paymentService;
        this.paymentRepository = paymentRepository;
        this.customerRepository = customerRepository;
        this.paymentReceiptService = paymentReceiptService;
        this.bookingService = bookingService;
        this.bookingRepository = bookingRepository;
    }

    // Create a payment record and generate receipt on success
    @PostMapping
    public ResponseEntity<?> createPayment(
            @RequestBody Map<String, String> request) {

        try {
            String customerIdText = request.get("customerId");

            if (customerIdText == null || customerIdText.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message", "Customer ID is required."
                        ));
            }

            Long customerId = Long.parseLong(customerIdText);

            Customer customer = customerRepository.findById(customerId)
                    .orElse(null);

            if (customer == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of(
                                "message", "Customer not found."
                        ));
            }

            Payment payment = paymentService.createPayment(
                    customerId, request);

            Long bId = payment.getBookingId();

            if (bId == null && customer.getBookingId() != null) {
                bId = customer.getBookingId();
                payment.setBookingId(bId);
            }

            if (bId == null
                    && request.get("bookingId") != null
                    && !request.get("bookingId").isBlank()) {

                try {
                    bId = Long.parseLong(request.get("bookingId"));
                    payment.setBookingId(bId);
                } catch (Exception ignored) {
                }
            }

            if (payment.getPaymentReference() == null
                    || payment.getPaymentReference().isBlank()) {

                payment.setPaymentReference(
                        "REF-" + System.currentTimeMillis());
            }

            if (payment.getTransactionReference() == null
                    || payment.getTransactionReference().isBlank()) {

                payment.setTransactionReference(
                        "DEMO-TXN-" +
                        UUID.randomUUID()
                                .toString()
                                .substring(0, 8)
                                .toUpperCase());
            }

            payment = paymentRepository.save(payment);

            Map<String, Object> response = new LinkedHashMap<>();

            response.put("message", "Payment record created");
            response.put("demoMode", true);
            response.put("paymentId", payment.getId());
            response.put("customerId", payment.getCustomerId());
            response.put("bookingId", payment.getBookingId());
            response.put("amount", payment.getAmount());
            response.put("paymentMethod", payment.getPaymentMethod());
            response.put("paymentStatus", payment.getPaymentStatus());
            response.put("paymentReference", payment.getPaymentReference());
            response.put("transactionReference",
                    payment.getTransactionReference());

            response.put(
                    "clearanceStatus",
                    payment.getClearanceStatus() == null
                            ? "NOT_APPLICABLE"
                            : payment.getClearanceStatus()
            );

            response.put(
                    "notice",
                    "Demo payment only. No real money was transferred."
            );

            if ("SUCCESS".equalsIgnoreCase(
                    payment.getPaymentStatus())) {

                if (bId != null) {
                    try {
                        bookingService.confirm(bId);
                    } catch (Exception ignored) {
                    }
                }

                var receipt = paymentReceiptService
                        .generateReceipt(payment.getId());

                response.put("receipt", receipt);
                response.put("receiptGenerated", true);

            } else {

                response.put("receiptGenerated", false);

                response.put(
                        "receiptMessage",
                        "A receipt will be available if the payment succeeds."
                );
            }

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(response);

        } catch (NumberFormatException ex) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message", "Invalid customer ID."
                    ));

        } catch (IllegalArgumentException |
                 IllegalStateException ex) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message", ex.getMessage()
                    ));

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "message",
                            "Unable to create payment. Check the STS Console."
                    ));
        }
    }
}