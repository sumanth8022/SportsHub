package com.sportshub.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "booking")
@Getter
@Setter
@NoArgsConstructor
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "hold_expires_at")
    private LocalDateTime holdExpiresAt;

    @Column(nullable = false)
    private BigDecimal subtotal;

    @Column(nullable = false)
    private BigDecimal discount;

    @Column(nullable = false)
    private BigDecimal fee;

    @Column(nullable = false)
    private BigDecimal total;

    @Column(name = "split_count")
    private Integer splitCount;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "customer_email")
    private String customerEmail;

    @Column(name = "customer_phone")
    private String customerPhone;

    @Column(name = "payment_status")
    private String paymentStatus = "PENDING";

    @Column(name = "ticket_code")
    private String ticketCode;

    @Column(name = "qr_data", columnDefinition = "TEXT")
    private String qrData;

    @Column(name = "qr_used")
    private Boolean qrUsed = false;

    @Column(name = "qr_used_at")
    private LocalDateTime qrUsedAt;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BookingItem> items = new ArrayList<>();

    public enum Status {
        HELD,
        CONFIRMED,
        EXPIRED,
        CANCELLED
    }
}
