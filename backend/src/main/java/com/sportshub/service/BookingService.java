package com.sportshub.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import com.sportshub.domain.*;
import com.sportshub.dto.ApiDtos.*;
import com.sportshub.repository.*;
import com.sportshub.payment.repository.CustomerRepository;
import com.sportshub.payment.repository.PaymentRepository;
import com.sportshub.payment.entity.Payment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.ByteArrayOutputStream;
import java.math.*;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;

@Service
public class BookingService {
    final BookingRepository bookings;
    final BookingItemRepository items;
    final SlotReservationRepository reservations;
    final PricingService pricing;
    final StandCategoryRepository stands;
    final StadiumRepository stadiums;
    final StadiumEventRepository events;
    final VenueRepository venues;
    final ParkRepository parks;
    final CustomerRepository customerRepository;
    final PaymentRepository paymentRepository;

    @Value("${sportshub.holds.minutes:10}")
    long minutes;

    public BookingService(
            BookingRepository b,
            BookingItemRepository i,
            SlotReservationRepository r,
            PricingService p,
            StandCategoryRepository stands,
            StadiumRepository stadiums,
            StadiumEventRepository events,
            VenueRepository venues,
            ParkRepository parks,
            CustomerRepository customerRepository,
            PaymentRepository paymentRepository) {
        this.bookings = b;
        this.items = i;
        this.reservations = r;
        this.pricing = p;
        this.stands = stands;
        this.stadiums = stadiums;
        this.events = events;
        this.venues = venues;
        this.parks = parks;
        this.customerRepository = customerRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional
    public HoldResponse hold(QuoteRequest q) {
        validateRequest(q);

        // Stand capacity validation to prevent double-booking
        if (q.itemType() == BookingItem.ItemType.STADIUM) {
            validateStadiumAvailability(q);
        }

        var quote = pricing.quote(q);
        var b = new Booking();
        b.setStatus(Booking.Status.HELD);
        b.setPaymentStatus("PENDING");
        b.setHoldExpiresAt(LocalDateTime.now().plusMinutes(minutes));
        b.setSubtotal(quote.subtotal());
        b.setDiscount(quote.discount());
        b.setFee(quote.fee());
        b.setTotal(quote.total());
        b.setSplitCount(q.splitCount() == null ? 1 : q.splitCount());
        b.setCustomerName(q.customerName());
        b.setCustomerEmail(q.customerEmail());
        b.setCustomerPhone(q.customerPhone());
        b.setQrUsed(false);

        bookings.saveAndFlush(b);

        // Persistent ticket code and QR data generated once and persisted in DB
        String ticketCode = "SH-TKT-" + b.getId() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String qrData = "SPORTSHUB:TKT:" + b.getId() + ":" + ticketCode;
        b.setTicketCode(ticketCode);
        b.setQrData(qrData);
        bookings.save(b);

        var bi = new BookingItem();
        bi.setBooking(b);
        bi.setItemType(q.itemType());
        bi.setRefId(q.refId());
        bi.setVisitDate(q.visitDate());
        bi.setStartHour(q.startHour());
        bi.setEventId(q.eventId());
        bi.setStandId(q.standId());
        bi.setAdults(n(q.tickets().adult()));
        bi.setChildren(n(q.tickets().child()));
        bi.setFamilyPasses(n(q.tickets().family()));
        bi.setFamilyAdults(n(q.tickets().famAdults()));
        bi.setFamilyChildren(n(q.tickets().famChildren()));
        bi.setPicnic(n(q.tickets().picnic()));
        bi.setPrice(quote.linePrice());
        items.save(bi);

        if (q.itemType() == BookingItem.ItemType.SLOT) {
            var sr = new SlotReservation();
            sr.setVenueId(q.refId());
            sr.setSlotDate(q.visitDate());
            sr.setStartHour(q.startHour());
            sr.setBooking(b);
            try {
                reservations.saveAndFlush(sr);
            } catch (DataIntegrityViolationException e) {
                throw new SlotTakenException();
            }
        }

        var loc = resolveLocation(b.getId(), q.itemType(), q.refId());
        String qrUrl = "/api/bookings/" + b.getId() + "/qr";
        return new HoldResponse(b.getId(), b.getStatus().name(), b.getHoldExpiresAt(), quote, b.getTicketCode(),
                b.getQrData(), qrUrl, loc);
    }

    private void validateStadiumAvailability(QuoteRequest q) {
        Stadium s = stadiums.findById(q.refId())
                .orElseThrow(() -> new NoSuchElementException("Stadium not found: " + q.refId()));
        if (q.eventId() == null) {
            throw new IllegalArgumentException("eventId is required for a stadium booking.");
        }
        if (q.standId() == null) {
            throw new IllegalArgumentException("standId is required for a stadium booking.");
        }

        events.findByIdAndStadiumId(q.eventId(), q.refId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Event " + q.eventId() + " does not belong to stadium " + q.refId()));

        StandCategory stand = stands.findById(q.standId())
                .orElseThrow(() -> new NoSuchElementException("Stand not found: " + q.standId()));

        int requestedTickets = n(q.tickets().adult()) + n(q.tickets().child())
                + n(q.tickets().family()) * (n(q.tickets().famAdults()) + n(q.tickets().famChildren()));

        if (requestedTickets <= 0) {
            throw new IllegalArgumentException("At least one ticket is required.");
        }

        int capacity = stand.getCapacity() != null ? stand.getCapacity() : 500;
        var activeItems = items.findActiveStadiumItems(q.eventId(), q.standId(), LocalDateTime.now());
        int bookedTickets = activeItems.stream().mapToInt(bi -> n(bi.getAdults()) + n(bi.getChildren())
                + n(bi.getFamilyPasses()) * (n(bi.getFamilyAdults()) + n(bi.getFamilyChildren()))).sum();

        int available = Math.max(0, capacity - bookedTickets);
        if (requestedTickets > available) {
            throw new CapacityExceededException(
                    "Not enough tickets available in " + stand.getName() + ". Requested: " + requestedTickets
                            + ", Available: " + available);
        }
    }

    private void validateRequest(QuoteRequest q) {
        if (q.tickets() == null)
            throw new IllegalArgumentException("tickets are required.");
        if (n(q.tickets().adult()) < 0 || n(q.tickets().child()) < 0 || n(q.tickets().family()) < 0
                || n(q.tickets().picnic()) < 0) {
            throw new IllegalArgumentException("Ticket quantities cannot be negative.");
        }
        if (q.itemType() == BookingItem.ItemType.SLOT) {
            if (q.visitDate() == null || q.startHour() == null) {
                throw new IllegalArgumentException("visitDate and startHour are required for a slot.");
            }
            ZoneId zone = ZoneId.of("Asia/Kolkata");
            ZonedDateTime now = ZonedDateTime.now(zone);
            LocalDate today = now.toLocalDate();
            LocalTime currentTime = now.toLocalTime();

            boolean isPast = q.visitDate().isBefore(today) ||
                    (q.visitDate().isEqual(today) && !currentTime.isBefore(LocalTime.of(q.startHour(), 0)));

            if (isPast) {
                throw new IllegalArgumentException("Cannot book a slot in the past.");
            }
        }
        if (q.itemType() == BookingItem.ItemType.STADIUM && (q.eventId() == null || q.standId() == null)) {
            throw new IllegalArgumentException("eventId and standId are required for a stadium booking.");
        }
        if (q.itemType() != BookingItem.ItemType.PARK && n(q.tickets().picnic()) > 0) {
            throw new IllegalArgumentException("Picnic options are available only for park bookings.");
        }
        int totalTickets = n(q.tickets().adult()) + n(q.tickets().child())
                + n(q.tickets().family()) * (n(q.tickets().famAdults()) + n(q.tickets().famChildren()))
                + n(q.tickets().picnic());
        if (totalTickets <= 0) {
            throw new IllegalArgumentException("At least one ticket is required.");
        }
    }

    private int n(Integer x) {
        return x == null ? 0 : x;
    }

    @Transactional
    public void delete(Long id) {
        var b = bookings.findById(id).orElse(null);
        if (b == null)
            return;
        // Never cancel or delete a CONFIRMED booking via HTTP DELETE!
        // Confirmed bookings represent official paid tickets.
        if (b.getStatus() == Booking.Status.CONFIRMED) {
            return;
        }
        cancel(id);
    }

    @Transactional
    public BookingDetailsDto cancel(Long id) {
        var b = bookings.findById(id).orElseThrow(() -> new NoSuchElementException("Booking not found: " + id));
        reservations.deleteAll(reservations.findByBookingId(id));
        b.setStatus(Booking.Status.CANCELLED);
        b.setPaymentStatus("REFUND_24H_ACTIVE");
        bookings.save(b);

        // Update or record the refund on the payments table (24-hour refund SLA)
        try {
            var payments = paymentRepository.findByBookingId(id);
            if (!payments.isEmpty()) {
                for (var p : payments) {
                    p.setPaymentStatus("REFUND_INITIATED");
                    p.setClearanceStatus("REFUND_24H_ACTIVE");
                    if (p.getTransactionReference() == null || !p.getTransactionReference().startsWith("RFND-")) {
                        p.setTransactionReference("RFND-24H-" + id + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
                    }
                    if (p.getPaymentReference() == null || p.getPaymentReference().isBlank()) {
                        p.setPaymentReference("REF-SH-" + id);
                    }
                    paymentRepository.save(p);
                }
            } else {
                var cOpt = customerRepository.findFirstByBookingIdOrderByIdDesc(id);
                Payment p = new Payment();
                p.setBookingId(id);
                if (cOpt.isPresent()) {
                    p.setCustomerId(cOpt.get().getId());
                    p.setPayerName(cOpt.get().getFullName());
                } else {
                    p.setPayerName(b.getCustomerName() != null ? b.getCustomerName() : "SportsHub Customer");
                }
                p.setAmount(b.getTotal());
                p.setPaymentMethod("UPI");
                p.setPaymentStatus("REFUND_INITIATED");
                p.setClearanceStatus("REFUND_24H_ACTIVE");
                p.setPaymentReference("REF-SH-" + id);
                p.setTransactionReference("RFND-24H-" + id + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
                p.setCreatedAt(LocalDateTime.now());
                paymentRepository.save(p);
            }
        } catch (Exception e) {
            // Cancellation proceeds safely
        }

        return toDetailsDto(b);
    }

    @Transactional
    public HoldResponse confirm(Long id) {
        var b = bookings.findById(id).orElseThrow(() -> new NoSuchElementException("Booking not found: " + id));
        if (b.getStatus() == Booking.Status.CANCELLED) {
            throw new IllegalStateException("Cannot confirm a cancelled booking.");
        }
        if (b.getStatus() != Booking.Status.HELD && b.getStatus() != Booking.Status.CONFIRMED) {
            throw new IllegalStateException("Booking is not in a valid state for confirmation: " + b.getStatus());
        }
        if (b.getHoldExpiresAt() != null && b.getHoldExpiresAt().isBefore(LocalDateTime.now())) {
            reservations.deleteAll(reservations.findByBookingId(id));
            b.setStatus(Booking.Status.EXPIRED);
            bookings.save(b);
            throw new IllegalStateException("Hold has expired.");
        }
        b.setStatus(Booking.Status.CONFIRMED);
        b.setPaymentStatus("COMPLETED");
        b.setHoldExpiresAt(null);
        bookings.save(b);

        var i = b.getItems().get(0);
        var loc = resolveLocation(b.getId(), i.getItemType(), i.getRefId());
        String qrUrl = "/api/bookings/" + b.getId() + "/qr";

        return new HoldResponse(
                b.getId(),
                b.getStatus().name(),
                null,
                new QuoteResponse(
                        i.getItemType(),
                        i.getRefId(),
                        i.getPrice(),
                        b.getSubtotal(),
                        b.getDiscount(),
                        b.getFee(),
                        b.getTotal(),
                        b.getTotal().divide(BigDecimal.valueOf(Math.max(1, b.getSplitCount())), 0,
                                RoundingMode.HALF_UP),
                        ""),
                b.getTicketCode(),
                b.getQrData(),
                qrUrl,
                loc);
    }

    @Transactional(readOnly = true)
    public BookingDetailsDto getBooking(Long id) {
        var b = bookings.findById(id).orElseThrow(() -> new NoSuchElementException("Booking not found: " + id));
        return toDetailsDto(b);
    }

    @Transactional
    public QrValidationResponse validateQr(Long bookingId, String qrCode) {
        var b = bookings.findById(bookingId)
                .orElseThrow(() -> new NoSuchElementException("Booking not found: " + bookingId));

        if (b.getStatus() == Booking.Status.CANCELLED) {
            throw new IllegalStateException("Ticket QR validation failed: Booking is CANCELLED.");
        }
        if (b.getStatus() == Booking.Status.EXPIRED) {
            throw new IllegalStateException("Ticket QR validation failed: Booking has EXPIRED.");
        }
        if (b.getStatus() != Booking.Status.CONFIRMED) {
            throw new IllegalStateException(
                    "Ticket QR validation failed: Booking is on " + b.getStatus() + " status and not yet confirmed.");
        }

        if (qrCode == null || qrCode.isBlank()) {
            throw new IllegalArgumentException("Invalid QR code: QR code is required for validation.");
        }

        String trimmed = qrCode.trim();
        boolean matchesQrData = b.getQrData() != null && trimmed.equalsIgnoreCase(b.getQrData().trim());
        boolean matchesTicketCode = b.getTicketCode() != null && trimmed.equalsIgnoreCase(b.getTicketCode().trim());

        if (!matchesQrData && !matchesTicketCode) {
            throw new IllegalArgumentException("Invalid QR code: supplied code does not match booking " + bookingId);
        }

        if (Boolean.TRUE.equals(b.getQrUsed())) {
            throw new IllegalStateException(
                    "Ticket QR has already been used and checked in at " + b.getQrUsedAt() + ".");
        }

        b.setQrUsed(true);
        b.setQrUsedAt(LocalDateTime.now());
        bookings.save(b);

        return new QrValidationResponse(
                true,
                "Ticket identity verified successfully. Entry granted.",
                b.getTicketCode(),
                b.getId(),
                b.getQrUsedAt());
    }

    @Transactional
    public byte[] generateQrImage(Long bookingId, int width, int height) {
        var b = bookings.findById(bookingId)
                .orElseThrow(() -> new NoSuchElementException("Booking not found: " + bookingId));
        String qrData = b.getQrData();
        if (qrData == null || qrData.isBlank()) {
            String ticketCode = b.getTicketCode();
            if (ticketCode == null || ticketCode.isBlank()) {
                ticketCode = "SH-TKT-" + b.getId() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                b.setTicketCode(ticketCode);
            }
            qrData = "SPORTSHUB:TKT:" + b.getId() + ":" + ticketCode;
            b.setQrData(qrData);
            bookings.save(b);
        }

        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 1);
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);

            BitMatrix bitMatrix = qrCodeWriter.encode(
                    qrData,
                    BarcodeFormat.QR_CODE,
                    Math.max(100, width),
                    Math.max(100, height),
                    hints);

            ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
            return pngOutputStream.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate QR code image for booking ID " + bookingId, e);
        }
    }

    @Transactional(readOnly = true)
    public BookingLocationDto getBookingLocation(Long bookingId) {
        var b = bookings.findById(bookingId)
                .orElseThrow(() -> new NoSuchElementException("Booking not found: " + bookingId));
        if (b.getItems().isEmpty()) {
            return null;
        }
        var item = b.getItems().get(0);
        return resolveLocation(b.getId(), item.getItemType(), item.getRefId());
    }

    public BookingLocationDto resolveLocation(Long bookingId, BookingItem.ItemType itemType, Long refId) {
        String name = "SportsHub Venue";
        String type = itemType != null ? itemType.name() : "LOCATION";
        String address = "SportsHub Central";
        String area = "Main Area";
        String city = "India";
        String state = "India";
        Double latitude = 17.3850;
        Double longitude = 78.4867;

        if (itemType == BookingItem.ItemType.STADIUM) {
            var opt = stadiums.findById(refId);
            if (opt.isPresent()) {
                var s = opt.get();
                name = s.getName();
                type = "STADIUM";
                area = s.getArea();
                city = s.getCity() != null ? s.getCity().getName() : "India";
                state = s.getState() != null ? s.getState() : city;
                address = s.getAddress() != null ? s.getAddress() : (s.getName() + ", " + s.getArea() + ", " + city);
                latitude = s.getLatitude() != null ? s.getLatitude() : 17.4065;
                longitude = s.getLongitude() != null ? s.getLongitude() : 78.5593;
            }
        } else if (itemType == BookingItem.ItemType.PARK) {
            var opt = parks.findById(refId);
            if (opt.isPresent()) {
                var p = opt.get();
                name = p.getName();
                type = "PARK";
                area = p.getArea();
                city = p.getCity() != null ? p.getCity().getName() : "India";
                state = p.getState() != null ? p.getState() : city;
                address = p.getAddress() != null ? p.getAddress() : (p.getName() + ", " + p.getArea() + ", " + city);
                latitude = p.getLatitude() != null ? p.getLatitude() : 17.4200;
                longitude = p.getLongitude() != null ? p.getLongitude() : 78.4600;
            }
        } else if (itemType == BookingItem.ItemType.SLOT) {
            var opt = venues.findById(refId);
            if (opt.isPresent()) {
                var v = opt.get();
                name = v.getName();
                type = "VENUE";
                area = v.getSubArea();
                city = v.getCity() != null ? v.getCity().getName() : "India";
                state = v.getState() != null ? v.getState() : city;
                address = v.getAddress() != null ? v.getAddress() : (v.getName() + ", " + v.getSubArea() + ", " + city);
                latitude = v.getLatitude() != null ? v.getLatitude() : 17.4401;
                longitude = v.getLongitude() != null ? v.getLongitude() : 78.3489;
            }
        }

        String query = name + ", " + address;
        String encoded = URLEncoder.encode(name + ", " + city, StandardCharsets.UTF_8);
        String mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encoded;

        return new BookingLocationDto(
                bookingId,
                refId,
                name,
                type,
                address,
                area,
                city,
                state,
                latitude,
                longitude,
                mapsUrl,
                query);
    }

    @Transactional(readOnly = true)
    public List<BookingDetailsDto> getMyBookings(String email, String phone, Long customerId) {
        Set<Long> bookingIds = new LinkedHashSet<>();

        if (customerId != null) {
            customerRepository.findById(customerId).ifPresent(c -> {
                if (c.getBookingId() != null)
                    bookingIds.add(c.getBookingId());
            });
        }

        if (email != null && !email.isBlank()) {
            String trimmed = email.trim();
            customerRepository.findByEmailIgnoreCase(trimmed)
                    .forEach(c -> {
                        if (c.getBookingId() != null)
                            bookingIds.add(c.getBookingId());
                    });
            bookings.findByCustomerEmailIgnoreCase(trimmed)
                    .forEach(b -> bookingIds.add(b.getId()));
        }

        if (phone != null && !phone.isBlank()) {
            String trimmed = phone.trim();
            customerRepository.findByMobileNumber(trimmed)
                    .forEach(c -> {
                        if (c.getBookingId() != null)
                            bookingIds.add(c.getBookingId());
                    });
            bookings.findByCustomerPhone(trimmed)
                    .forEach(b -> bookingIds.add(b.getId()));
        }

        List<Booking> list;
        if (!bookingIds.isEmpty()) {
            list = bookings.findAllById(bookingIds).stream()
                    .filter(b -> b.getStatus() == Booking.Status.CONFIRMED || b.getStatus() == Booking.Status.HELD || b.getStatus() == Booking.Status.CANCELLED)
                    .sorted(Comparator.comparing(Booking::getId).reversed())
                    .toList();
        } else if ((email == null || email.isBlank()) && (phone == null || phone.isBlank()) && customerId == null) {
            list = bookings.findAllByOrderByIdDesc().stream()
                    .filter(b -> b.getStatus() == Booking.Status.CONFIRMED || b.getStatus() == Booking.Status.HELD || b.getStatus() == Booking.Status.CANCELLED)
                    .toList();
        } else {
            list = List.of();
        }

        return list.stream().map(this::toDetailsDto).toList();
    }

    private BookingDetailsDto toDetailsDto(Booking b) {
        var itemDtos = b.getItems().stream().map(i -> {
            String eventTitle = null;
            if (i.getEventId() != null) {
                eventTitle = events.findById(i.getEventId()).map(StadiumEvent::getTitle).orElse(null);
            }
            String standTitle = null;
            if (i.getStandId() != null) {
                standTitle = stands.findById(i.getStandId()).map(StandCategory::getName).orElse(null);
            }
            if (eventTitle == null) {
                if (i.getItemType() == BookingItem.ItemType.SLOT) {
                    eventTitle = venues.findById(i.getRefId()).map(Venue::getName).orElse("Sports Turf Slot");
                } else if (i.getItemType() == BookingItem.ItemType.PARK) {
                    eventTitle = parks.findById(i.getRefId()).map(Park::getName).orElse("Sports Park Entry");
                } else if (i.getItemType() == BookingItem.ItemType.STADIUM) {
                    eventTitle = stadiums.findById(i.getRefId()).map(Stadium::getName).orElse("Stadium Match Day");
                }
            }
            return new BookingItemDto(
                    i.getId(),
                    i.getItemType(),
                    i.getRefId(),
                    i.getEventId(),
                    i.getStandId(),
                    i.getVisitDate(),
                    i.getStartHour(),
                    i.getAdults(),
                    i.getChildren(),
                    i.getFamilyPasses(),
                    i.getFamilyAdults(),
                    i.getFamilyChildren(),
                    i.getPicnic(),
                    i.getPrice(),
                    eventTitle,
                    standTitle);
        }).toList();

        BookingLocationDto loc = null;
        if (!b.getItems().isEmpty()) {
            var first = b.getItems().get(0);
            loc = resolveLocation(b.getId(), first.getItemType(), first.getRefId());
        }

        String qrImageUrl = "/api/bookings/" + b.getId() + "/qr";

        String cName = b.getCustomerName();
        String cEmail = b.getCustomerEmail();
        String cPhone = b.getCustomerPhone();

        if (cName == null || cEmail == null || cPhone == null) {
            var cOpt = customerRepository.findFirstByBookingIdOrderByIdDesc(b.getId());
            if (cOpt.isPresent()) {
                var c = cOpt.get();
                if (cName == null)
                    cName = c.getFullName();
                if (cEmail == null)
                    cEmail = c.getEmail();
                if (cPhone == null)
                    cPhone = c.getMobileNumber();
            }
        }

        String paymentRef = null;
        String txnRef = null;
        String refundStatus = null;
        LocalDateTime refundEligibleUntil = null;

        try {
            var payOpt = paymentRepository.findTopByBookingIdOrderByIdDesc(b.getId());
            if (payOpt.isPresent()) {
                var pay = payOpt.get();
                paymentRef = pay.getPaymentReference();
                txnRef = pay.getTransactionReference();
                refundStatus = pay.getPaymentStatus();
                if (pay.getCreatedAt() != null) {
                    refundEligibleUntil = pay.getCreatedAt().plusHours(24);
                }
            }
        } catch (Exception ignored) {}

        if (paymentRef == null || paymentRef.isBlank()) {
            paymentRef = "REF-SH-" + b.getId() + "A";
        }
        if (txnRef == null || txnRef.isBlank()) {
            txnRef = "TXN_SH_" + b.getId() + "9A2B";
        }
        if (b.getStatus() == Booking.Status.CANCELLED) {
            if (refundStatus == null || !refundStatus.contains("REFUND")) {
                refundStatus = "REFUND_24H_ACTIVE";
            }
            if (refundEligibleUntil == null) {
                refundEligibleUntil = LocalDateTime.now().plusHours(24);
            }
        }

        return new BookingDetailsDto(
                b.getId(),
                b.getStatus().name(),
                b.getPaymentStatus(),
                b.getHoldExpiresAt(),
                b.getSubtotal(),
                b.getDiscount(),
                b.getFee(),
                b.getTotal(),
                b.getSplitCount(),
                cName,
                cEmail,
                cPhone,
                b.getTicketCode(),
                b.getQrData(),
                b.getQrUsed(),
                b.getQrUsedAt(),
                itemDtos,
                loc,
                qrImageUrl,
                paymentRef,
                txnRef,
                refundStatus,
                refundEligibleUntil);
    }

    @Transactional
    public void expire() {
        var now = LocalDateTime.now();
        for (var b : bookings.findByStatusAndHoldExpiresAtBefore(Booking.Status.HELD, now)) {
            reservations.deleteAll(reservations.findByBookingId(b.getId()));
            b.setStatus(Booking.Status.EXPIRED);
            bookings.save(b);
        }
    }

    public static class SlotTakenException extends RuntimeException {
        public SlotTakenException() {
            super("That slot was just taken. Please choose another slot.");
        }
    }

    public static class CapacityExceededException extends RuntimeException {
        public CapacityExceededException(String message) {
            super(message);
        }
    }
}
