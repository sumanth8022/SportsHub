package com.sportshub.repository;

import com.sportshub.domain.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByStatusAndHoldExpiresAtBefore(Booking.Status status, LocalDateTime t);
    List<Booking> findByCustomerEmailIgnoreCase(String customerEmail);
    List<Booking> findByCustomerPhone(String customerPhone);
    List<Booking> findByStatusOrderByIdDesc(Booking.Status status);
    List<Booking> findAllByOrderByIdDesc();
}
