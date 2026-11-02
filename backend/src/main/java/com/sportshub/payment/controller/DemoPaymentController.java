package com.sportshub.payment.controller;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sportshub.payment.entity.Payment;
import com.sportshub.payment.entity.PaymentReceipt;
import com.sportshub.payment.repository.PaymentRepository;
import com.sportshub.payment.repository.CustomerRepository;
import com.sportshub.payment.service.EmailSenderService;
import com.sportshub.payment.service.PaymentReceiptService;
import com.sportshub.service.BookingService;

@RestController
@RequestMapping("/api/demo/payments")
@CrossOrigin(
        origins = {
                "http://localhost:5173",
                "http://localhost:4173"
        }
)
public class DemoPaymentController {

    private final PaymentRepository paymentRepository;
    private final PaymentReceiptService paymentReceiptService;
    private final EmailSenderService emailSenderService;
    private final BookingService bookingService;
    private final CustomerRepository customerRepository;

    @Value("${payment.demo.enabled:false}")
    private boolean demoEnabled;

    public DemoPaymentController(
            PaymentRepository paymentRepository,
            PaymentReceiptService paymentReceiptService,
            EmailSenderService emailSenderService,
            BookingService bookingService,
            CustomerRepository customerRepository) {

        this.customerRepository = customerRepository;
        this.bookingService = bookingService;

        this.paymentRepository = paymentRepository;
        this.paymentReceiptService = paymentReceiptService;
        this.emailSenderService = emailSenderService;
    }

    @PostMapping("/{paymentId}/complete")
    public ResponseEntity<?> completeDemoPayment(
            @PathVariable Long paymentId,
            @RequestBody Map<String, String> request) {

        if (!demoEnabled) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message", "Demo payments are disabled."));
        }

        Payment payment = paymentRepository.findById(paymentId)
                .orElse(null);

        if (payment == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Payment not found."));
        }

        String method = normalize(payment.getPaymentMethod());

        if ("CASH".equals(method)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "Cash is recorded during payment creation. It cannot use the electronic completion endpoint.",
                            "paymentStatus", payment.getPaymentStatus()));
        }

        if (isChequeOrDd(method)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "Use the separate cheque/DD clearance endpoint.",
                            "paymentStatus", payment.getPaymentStatus(),
                            "clearanceStatus",
                            payment.getClearanceStatus() == null
                                    ? "PENDING_CLEARANCE"
                                    : payment.getClearanceStatus()));
        }

        if (!"PENDING".equalsIgnoreCase(payment.getPaymentStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message", "Only pending payments can be simulated.",
                            "paymentStatus", payment.getPaymentStatus()));
        }

        String outcome = normalize(request.get("simulationOutcome"));

        if (!"SUCCESS".equals(outcome) && !"FAILED".equals(outcome)) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Provide SUCCESS or FAILED as simulationOutcome."));
        }

        if ("SUCCESS".equals(outcome)) {
            Long bId = payment.getBookingId();

            if (bId == null && payment.getCustomerId() != null) {
                var c = customerRepository
                        .findById(payment.getCustomerId())
                        .orElse(null);

                if (c != null) {
                    bId = c.getBookingId();
                }
            }

            if (bId != null) {
                try {
                    bookingService.confirm(bId);
                } catch (Exception ignored) {
                }
            }

            payment.setPaymentStatus("SUCCESS");

            payment.setTransactionReference(
                    "DEMO-TXN-" + UUID.randomUUID()
                            .toString()
                            .substring(0, 8)
                            .toUpperCase(Locale.ROOT));

        } else {

            payment.setPaymentStatus("FAILED");
            payment.setTransactionReference(null);
        }

        Payment savedPayment = paymentRepository.save(payment);

        Map<String, Object> response = new LinkedHashMap<>();

        response.put("message", "Demo payment processed.");
        response.put("demoMode", true);
        response.put("payment", savedPayment);

        if ("SUCCESS".equals(outcome)) {

            Long bId = payment.getBookingId();

            if (bId == null && payment.getCustomerId() != null) {
                var c = customerRepository
                        .findById(payment.getCustomerId())
                        .orElse(null);

                if (c != null) {
                    bId = c.getBookingId();
                }
            }

            if (bId != null) {
                try {
                    bookingService.confirm(bId);
                } catch (Exception ignored) {
                }
            }

            PaymentReceipt receipt =
                    paymentReceiptService.generateReceipt(
                            savedPayment.getId());

            response.put("receipt", receipt);
            addEmailStatus(response, receipt);

            response.put(
                    "notice",
                    "Simulated success only. No real money was collected.");

        } else {

            response.put(
                    "notice",
                    "Simulated failure only. No real payment was attempted.");
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{paymentId}/clearance")
    public ResponseEntity<?> clearChequeOrDd(
            @PathVariable Long paymentId,
            @RequestBody Map<String, String> request) {

        if (!demoEnabled) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message", "Demo payments are disabled."));
        }

        Payment payment = paymentRepository.findById(paymentId)
                .orElse(null);

        if (payment == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Payment not found."));
        }

        String method = normalize(payment.getPaymentMethod());

        if (!isChequeOrDd(method)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "This endpoint is only for Cheque/DD payments."));
        }

        if (!"PENDING".equalsIgnoreCase(payment.getPaymentStatus())
                || (payment.getClearanceStatus() != null
                && !"PENDING_CLEARANCE".equalsIgnoreCase(
                        payment.getClearanceStatus()))) {

            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "Only cheque/DD payments awaiting clearance can be processed.",
                            "paymentStatus", payment.getPaymentStatus(),
                            "clearanceStatus",
                            payment.getClearanceStatus() == null
                                    ? "PENDING_CLEARANCE"
                                    : payment.getClearanceStatus()));
        }

        String decision = normalize(request.get("decision"));

        if (!"CLEARED".equals(decision)
                && !"REJECTED".equals(decision)) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "decision must be CLEARED or REJECTED."));
        }

        Map<String, Object> response = new LinkedHashMap<>();

        if ("CLEARED".equals(decision)) {

            Long bId = payment.getBookingId();

            if (bId == null && payment.getCustomerId() != null) {
                var c = customerRepository
                        .findById(payment.getCustomerId())
                        .orElse(null);

                if (c != null) {
                    bId = c.getBookingId();
                }
            }

            if (bId != null) {
                try {
                    bookingService.confirm(bId);
                } catch (Exception ignored) {
                }
            }

            payment.setClearanceStatus("CLEARED");
            payment.setPaymentStatus("SUCCESS");

            payment.setTransactionReference(
                    "DEMO-CHQ-" + UUID.randomUUID()
                            .toString()
                            .substring(0, 8)
                            .toUpperCase(Locale.ROOT));

        } else {

            payment.setClearanceStatus("REJECTED");
            payment.setPaymentStatus("FAILED");
            payment.setTransactionReference(null);
        }

        Payment savedPayment = paymentRepository.save(payment);

        response.put("message", "Cheque/DD clearance decision recorded.");
        response.put("demoMode", true);
        response.put("payment", savedPayment);
        response.put("clearanceStatus", savedPayment.getClearanceStatus());

        if ("CLEARED".equals(decision)) {

            Long bId = payment.getBookingId();

            if (bId == null && payment.getCustomerId() != null) {
                var c = customerRepository
                        .findById(payment.getCustomerId())
                        .orElse(null);

                if (c != null) {
                    bId = c.getBookingId();
                }
            }

            if (bId != null) {
                try {
                    bookingService.confirm(bId);
                } catch (Exception ignored) {
                }
            }

            PaymentReceipt receipt =
                    paymentReceiptService.generateReceipt(
                            savedPayment.getId());

            response.put("receipt", receipt);
            addEmailStatus(response, receipt);

            response.put(
                    "notice",
                    "Demo clearance recorded by an operator. No bank verification was performed by this application.");

        } else {

            response.put(
                    "notice",
                    "Cheque/DD marked rejected in the demo. No receipt was issued.");
        }

        return ResponseEntity.ok(response);
    }

    private void addEmailStatus(
            Map<String, Object> response,
            PaymentReceipt receipt) {

        try {
            emailSenderService.sendReceipt(receipt);
            response.put("emailStatus", "Receipt email sent successfully.");

        } catch (Exception ex) {

            response.put(
                    "emailStatus",
                    "Payment recorded, but receipt email could not be sent.");
        }
    }

    private String normalize(String value) {
        return value == null
                ? ""
                : value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isChequeOrDd(String method) {
        return "CHEQUE_DD".equals(method)
                || "CHEQUE/DD".equals(method)
                || "CHEQUE".equals(method)
                || "DD".equals(method);
    }
}