package com.sportshub.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "stand_category")
@Getter
@Setter
@NoArgsConstructor
public class StandCategory {
    @Id
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "price_multiplier", nullable = false)
    private BigDecimal priceMultiplier;

    private Integer capacity;
}
