
package com.sportshub.payment.controller;

import java.time.LocalDateTime;
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
import com.sportshub.payment.service.EmailSenderService;
import com.sportshub.payment.service.PaymentReceiptService;

@RestController
@RequestMapping("/api/demo/payments")
@CrossOrigin(origins = "*")
public class ChequeDdClearanceController {

    private final PaymentRepository paymentRepository;
    private final PaymentReceiptService paymentReceiptService;
    private final EmailSenderService emailSenderService;

    @Value("${payment.demo.enabled:false}")
    private boolean demoEnabled;

    public ChequeDdClearanceController(
            PaymentRepository paymentRepository,
            PaymentReceiptService paymentReceiptService,
            EmailSenderService emailSenderService) {
        this.paymentRepository = paymentRepository;
        this.paymentReceiptService = paymentReceiptService;
        this.emailSenderService = emailSenderService;
    }

    @PostMapping("/{paymentId}/cheque-clearance")
    public ResponseEntity<?> updateChequeClearance(
            @PathVariable Long paymentId,
            @RequestBody Map<String, String> request) {

        if (!demoEnabled) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message",
                            "Demo payment operations are disabled."));
        }

        Payment payment = paymentRepository.findById(paymentId)
                .orElse(null);

        if (payment == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Payment not found."));
        }

        if (!"CHEQUE_DD".equalsIgnoreCase(
                payment.getPaymentMethod() == null
                        ? ""
                        : payment.getPaymentMethod().trim())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message",
                            "This endpoint is only for Cheque/DD payments."));
        }

        if (!"PENDING".equalsIgnoreCase(payment.getPaymentStatus())
                || !"PENDING_CLEARANCE".equalsIgnoreCase(
                        payment.getClearanceStatus() == null
                                ? ""
                                : payment.getClearanceStatus())) {

            Map<String, Object> error = new LinkedHashMap<>();
            error.put("message",
                    "Only payments awaiting cheque/DD clearance can be updated.");
            error.put("paymentStatus", payment.getPaymentStatus());
            error.put("clearanceStatus", payment.getClearanceStatus());

            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }

        String clearanceStatus = request.get("clearanceStatus");

        if (clearanceStatus == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message",
                            "Provide CLEARED or BOUNCED as clearanceStatus."));
        }

        clearanceStatus = clearanceStatus.trim()
                .toUpperCase(Locale.ROOT);

        if (!"CLEARED".equals(clearanceStatus)
                && !"BOUNCED".equals(clearanceStatus)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message",
                            "clearanceStatus must be CLEARED or BOUNCED."));
        }

        if ("CLEARED".equals(clearanceStatus)) {
            payment.setClearanceStatus("CLEARED");
            payment.setPaymentStatus("SUCCESS");
            payment.setClearedAt(LocalDateTime.now());
            payment.setTransactionReference(
                    "DEMO-CLEAR-" + UUID.randomUUID()
                            .toString().substring(0, 8)
                            .toUpperCase(Locale.ROOT));
        } else {
            payment.setClearanceStatus("BOUNCED");
            payment.setPaymentStatus("FAILED");
            payment.setClearedAt(null);
            payment.setTransactionReference(null);
        }

        Payment savedPayment = paymentRepository.save(payment);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Cheque/DD clearance updated.");
        response.put("demoMode", true);
        response.put("payment", savedPayment);

        if ("CLEARED".equals(clearanceStatus)) {
            PaymentReceipt receipt =
                    paymentReceiptService.generateReceipt(savedPayment.getId());

            response.put("receipt", receipt);

            try {
                emailSenderService.sendReceipt(receipt);
                response.put("emailStatus",
                        "Receipt email sent successfully.");
            } catch (Exception e) {
                response.put("emailStatus",
                        "Payment cleared, but receipt email could not be sent.");
            }

            response.put("notice",
                    "Demo clearance recorded. No bank verification or real money transfer occurred.");
        } else {
            response.put("notice",
                    "Demo cheque/DD marked as bounced. No bank verification was performed.");
        }

        return ResponseEntity.ok(response);
    }
}
