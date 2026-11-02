package com.sportshub.domain;
import jakarta.persistence.*; import lombok.*; import java.math.*; import java.time.*;
@Entity @Table(name="booking_item") @Getter @Setter @NoArgsConstructor public class BookingItem {
@Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @ManyToOne(optional=false) @JoinColumn(name="booking_id") private Booking booking; @Enumerated(EnumType.STRING) @Column(name="item_type",nullable=false) private ItemType itemType;
@Column(name="ref_id",nullable=false) private Long refId; @Column(name="visit_date") private LocalDate visitDate; @Column(name="start_hour") private Integer startHour; @Column(name="event_id") private Long eventId; @Column(name="stand_id") private Long standId;
private Integer adults,children; @Column(name="family_passes") private Integer familyPasses; @Column(name="family_adults") private Integer familyAdults; @Column(name="family_children") private Integer familyChildren; private Integer picnic; @Column(nullable=false) private BigDecimal price;
public enum ItemType{SLOT,PARK,STADIUM} }