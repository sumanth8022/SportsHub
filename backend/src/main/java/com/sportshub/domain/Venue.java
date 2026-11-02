package com.sportshub.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.*;

@Entity
@Table(name = "venue")
@Getter
@Setter
@NoArgsConstructor
public class Venue {
    @Id
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "sport_id")
    private Sport sport;

    @ManyToOne(optional = false)
    @JoinColumn(name = "city_id")
    private City city;

    @Column(nullable = false)
    private String name;

    @Column(name = "sub_area")
    private String subArea;

    private String address;

    private String state;

    private Double latitude;

    private Double longitude;

    @Column(name = "price_per_hour", nullable = false)
    private BigDecimal pricePerHour;

    private BigDecimal rating;

    @ManyToMany
    @JoinTable(
        name = "venue_tag",
        joinColumns = @JoinColumn(name = "venue_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<Tag> tags = new HashSet<>();
}
