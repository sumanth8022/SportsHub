package com.sportshub.domain;
import jakarta.persistence.*; import lombok.*; import java.time.*;
@Entity @Table(name="slot_reservation") @IdClass(SlotReservationId.class) @Getter @Setter @NoArgsConstructor public class SlotReservation {
@Id @Column(name="venue_id") private Long venueId; @Id @Column(name="slot_date") private LocalDate slotDate; @Id @Column(name="start_hour") private Integer startHour; @ManyToOne(optional=false) @JoinColumn(name="booking_id") private Booking booking; }