
package com.sportshub.payment.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sportshub.payment.entity.Customer;
import com.sportshub.payment.entity.Payment;
import com.sportshub.payment.entity.PaymentReceipt;
import com.sportshub.payment.repository.CustomerRepository;
import com.sportshub.payment.repository.PaymentRepository;
import com.sportshub.payment.repository.PaymentReceiptRepository;

@Service
public class PaymentReceiptService {

    private final PaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;
    private final PaymentReceiptRepository receiptRepository;

    public PaymentReceiptService(
            PaymentRepository paymentRepository,
            CustomerRepository customerRepository,
            PaymentReceiptRepository receiptRepository) {

        this.paymentRepository = paymentRepository;
        this.customerRepository = customerRepository;
        this.receiptRepository = receiptRepository;
    }

    @Transactional
    public PaymentReceipt generateReceipt(Long paymentId) {

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Payment not found"));

        if (!"SUCCESS".equals(payment.getPaymentStatus())) {
            throw new IllegalStateException(
                    "Receipt is available only after confirmed payment");
        }

        PaymentReceipt existing = receiptRepository
                .findByPaymentId(paymentId)
                .orElse(null);

        if (existing != null) {
            return existing;
        }

        Customer customer = customerRepository
                .findById(payment.getCustomerId())
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Customer not found"));

        PaymentReceipt receipt = new PaymentReceipt();

        receipt.setReceiptNumber(
                "RCT-" + UUID.randomUUID()
                        .toString().substring(0, 8)
                        .toUpperCase());

        receipt.setPaymentId(payment.getId());
        receipt.setCustomerId(customer.getId());
        receipt.setCustomerName(customer.getFullName());
        receipt.setCustomerEmail(customer.getEmail());
        receipt.setMobileNumber(customer.getMobileNumber());
        receipt.setAmount(payment.getAmount());
        receipt.setPaymentMethod(payment.getPaymentMethod());
        receipt.setTransactionReference(
                payment.getTransactionReference());
        receipt.setGeneratedAt(LocalDateTime.now());

        return receiptRepository.save(receipt);
    }
}
