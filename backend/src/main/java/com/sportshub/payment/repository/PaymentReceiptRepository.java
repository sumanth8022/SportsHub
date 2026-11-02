
package com.sportshub.payment.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sportshub.payment.entity.PaymentReceipt;

public interface PaymentReceiptRepository
        extends JpaRepository<PaymentReceipt, Long> {

    Optional<PaymentReceipt> findByPaymentId(Long paymentId);
}
