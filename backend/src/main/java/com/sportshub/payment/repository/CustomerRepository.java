package com.sportshub.payment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.sportshub.payment.entity.Customer;
import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findFirstByBookingIdOrderByIdDesc(Long bookingId);
    List<Customer> findByBookingId(Long bookingId);
    List<Customer> findByEmailIgnoreCase(String email);
    List<Customer> findByMobileNumber(String mobileNumber);
}
