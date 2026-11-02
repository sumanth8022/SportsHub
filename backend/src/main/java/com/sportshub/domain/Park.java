package com.sportshub.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.*;

@Entity
@Table(name = "park")
@Getter
@Setter
@NoArgsConstructor
public class Park {
    @Id
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "category_id")
    private ParkCategory category;

    @ManyToOne(optional = false)
    @JoinColumn(name = "city_id")
    private City city;

    @Column(nullable = false)
    private String name;

    private String area;

    private String address;

    private String state;

    private Double latitude;

    private Double longitude;

    @Column(name = "base_price", nullable = false)
    private BigDecimal basePrice;

    @ManyToMany
    @JoinTable(
        name = "park_tag",
        joinColumns = @JoinColumn(name = "park_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<Tag> tags = new HashSet<>();
}
