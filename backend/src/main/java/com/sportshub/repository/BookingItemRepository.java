package com.sportshub.repository;

import com.sportshub.domain.BookingItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface BookingItemRepository extends JpaRepository<BookingItem, Long> {
    List<BookingItem> findByBookingId(Long bookingId);

    @Query("""
        SELECT bi FROM BookingItem bi
        WHERE bi.eventId = :eventId
          AND bi.standId = :standId
          AND (
              bi.booking.status = com.sportshub.domain.Booking.Status.CONFIRMED
              OR (bi.booking.status = com.sportshub.domain.Booking.Status.HELD AND bi.booking.holdExpiresAt > :now)
          )
    """)
    List<BookingItem> findActiveStadiumItems(
        @Param("eventId") Long eventId,
        @Param("standId") Long standId,
        @Param("now") LocalDateTime now
    );
}
