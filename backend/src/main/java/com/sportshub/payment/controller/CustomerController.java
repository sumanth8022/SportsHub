package com.sportshub.payment.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.sportshub.payment.entity.Customer;
import com.sportshub.payment.repository.CustomerRepository;
import com.sportshub.repository.BookingRepository;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(
    origins = {
        "http://localhost:5173",
        "http://localhost:4173"
    }
)
public class CustomerController {

    private final CustomerRepository customerRepository;
    private final BookingRepository bookingRepository;

    public CustomerController(
            CustomerRepository customerRepository,
            BookingRepository bookingRepository) {
        this.customerRepository = customerRepository;
        this.bookingRepository = bookingRepository;
    }

    @PostMapping
    public ResponseEntity<Customer> createCustomer(@RequestBody Customer customer) {
        customer.setPaymentStatus("PENDING");

        Customer savedCustomer = customerRepository.save(customer);

        if (savedCustomer.getBookingId() != null) {
            bookingRepository.findById(savedCustomer.getBookingId()).ifPresent(b -> {
                b.setCustomerName(savedCustomer.getFullName());
                b.setCustomerEmail(savedCustomer.getEmail());
                b.setCustomerPhone(savedCustomer.getMobileNumber());
                bookingRepository.save(b);
            });
        }

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedCustomer);
    }

    @GetMapping
    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Customer> getCustomerById(@PathVariable Long id) {
        return customerRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}