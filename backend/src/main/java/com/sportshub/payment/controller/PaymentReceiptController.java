
package com.sportshub.payment.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.sportshub.payment.entity.PaymentReceipt;
import com.sportshub.payment.repository.PaymentReceiptRepository;
import com.sportshub.payment.service.PaymentReceiptService;

@RestController
@RequestMapping("/api/receipts")
@CrossOrigin(origins = "*")
public class PaymentReceiptController {

    private final PaymentReceiptService receiptService;
    private final PaymentReceiptRepository receiptRepository;

    public PaymentReceiptController(
            PaymentReceiptService receiptService,
            PaymentReceiptRepository receiptRepository) {

        this.receiptService = receiptService;
        this.receiptRepository = receiptRepository;
    }

    @PostMapping("/generate/{paymentId}")
    public ResponseEntity<?> generateReceipt(
            @PathVariable Long paymentId) {

        try {
            PaymentReceipt receipt =
                    receiptService.generateReceipt(paymentId);

            return ResponseEntity.ok(receipt);

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", ex.getMessage()));

        } catch (IllegalStateException ex) {
            return ResponseEntity.status(409).body(
                    Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/payment/{paymentId}")
    public ResponseEntity<?> getReceipt(
            @PathVariable Long paymentId) {

        return receiptRepository.findByPaymentId(paymentId)
                .<ResponseEntity<?>>map(
                        receipt -> ResponseEntity.ok(receipt))
                .orElseGet(() ->
                        ResponseEntity.status(404).body(
                                Map.of("message",
                                        "Receipt not available")));
    }
}
