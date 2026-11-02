package com.sportshub.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.*;

@Entity
@Table(name = "stadium")
@Getter
@Setter
@NoArgsConstructor
public class Stadium {
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

    private String area;

    private String address;

    private String state;

    private Double latitude;

    private Double longitude;

    private Integer capacity;

    private BigDecimal rating;

    private String image;

    @Column(name = "base_price", nullable = false)
    private BigDecimal basePrice;

    @ManyToMany
    @JoinTable(
        name = "stadium_tag",
        joinColumns = @JoinColumn(name = "stadium_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<Tag> tags = new HashSet<>();
}
