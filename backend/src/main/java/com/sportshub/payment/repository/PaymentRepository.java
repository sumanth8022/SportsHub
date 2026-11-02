package com.sportshub.payment.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.sportshub.payment.entity.Payment;

public interface PaymentRepository
        extends JpaRepository<Payment, Long> {
    List<Payment> findByBookingId(Long bookingId);
    Optional<Payment> findTopByBookingIdOrderByIdDesc(Long bookingId);
    List<Payment> findByCustomerId(Long customerId);
    List<Payment> findAllByOrderByIdDesc();
}
