import React, { useEffect, useState } from "react";
import "./TicketPassModal.css";
import { downloadTicketPass, downloadQrImage } from "../../utils/ticketDownloader";
import SportsHubCompanion from "../companion/SportsHubCompanion.jsx";

export default function TicketPassModal({
  booking,
  selected,
  paymentResult,
  onClose,
}) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
  const bookingId = booking?.bookingId || booking?.id || 101;
  const totalAmount = paymentResult?.amount ?? booking?.quote?.total ?? booking?.total ?? selected?.price ?? 0;
  const txnId = booking?.transactionReference || paymentResult?.transactionId || `TXN_SH_${bookingId}9A2B`;
  const paymentRef = booking?.paymentReference || paymentResult?.paymentReference || paymentResult?.receipt?.transactionReference || `REF-SH-${bookingId}`;
  const isCancelled = booking?.status === "CANCELLED";
  const utr = paymentResult?.utr || `UTR${Date.now()}`;
  const method = paymentResult?.paymentMethod || booking?.paymentStatus || "UPI / Card";

  const entryCode = booking?.ticketCode || paymentResult?.booking?.ticketCode || `SH-TKT-${bookingId}`;
  const qrImageUrl = `${API_BASE}/bookings/${bookingId}/qr`;

  // Backend-driven location state
  const [location, setLocation] = useState(booking?.location || null);
  const [loadingLoc, setLoadingLoc] = useState(!booking?.location);

  useEffect(() => {
    let active = true;
    if (booking?.location) {
      setLocation(booking.location);
      setLoadingLoc(false);
      return;
    }
    fetch(`${API_BASE}/bookings/${bookingId}/location`)
      .then((r) => (r.ok ? r.json() : null))
      .then((loc) => {
        if (active && loc) setLocation(loc);
      })
      .catch((err) => console.error("Error fetching booking location:", err))
      .finally(() => {
        if (active) setLoadingLoc(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId, booking?.location, API_BASE]);

  const venueName = location?.venueName || selected?.title || "SportsHub Venue";
  const venueAddress = location?.address || (location?.area ? `${location.area}, ${location.city}` : selected?.detail) || "Central Grounds";
  const venueCityState = location?.city ? `${location.city}${location.state ? `, ${location.state}` : ""}` : "";
  const googleMapsUrl = location?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venueName}, ${location?.city || "India"}`)}`;
  const mapLat = location?.latitude || 17.3850;
  const mapLng = location?.longitude || 78.4867;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${mapLat},${mapLng}&hl=en&z=15&output=embed`;

  const openAppMap = (service) => {
    const lat = location?.latitude || 17.3850;
    const lng = location?.longitude || 78.4867;
    const destName = encodeURIComponent(venueName);
    switch (service) {
      case "uber":
        window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${destName}`, "_blank", "noopener,noreferrer");
        break;
      case "ola":
        window.open(`https://book.olacabs.com/?lat=${lat}&lng=${lng}&drop_name=${destName}`, "_blank", "noopener,noreferrer");
        break;
      case "rapido":
        window.open(`https://www.rapido.bike/`, "_blank", "noopener,noreferrer");
        break;
      default:
        window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="ticket-overlay" role="dialog" aria-modal="true" aria-label="Official Ticket Pass">
      <div className="ticket-card">
        {/* Ticket Top Ribbon */}
        <div className="ticket-top-ribbon">
          <div className="ticket-badge-group">
            <span className="ticket-icon">🎟️</span>
            <div>
              <h3>Official Entry Pass</h3>
              <p>SportsHub Verified · Backend QR Verified</p>
            </div>
          </div>
          <button
            type="button"
            className="ticket-close-btn"
            onClick={onClose}
            aria-label="Close Ticket"
          >
            ✕
          </button>
        </div>

        {/* Boarding Pass Style Body */}
        <div className="ticket-pass-container">
          <div className="ticket-main-section">
            <div className="ticket-header-row">
              <span className={`ticket-status-pill ${isCancelled ? "cancelled" : ""}`} style={isCancelled ? { background: "#fee2e2", color: "#991b1b" } : {}}>
                {isCancelled ? "🚫 TICKET CANCELLED" : "CONFIRMED & ACTIVE"}
              </span>
              {location?.venueType && (
                <span className="ticket-type-badge">📍 {location.venueType}</span>
              )}
            </div>

            <h2 className="ticket-venue-title">{venueName}</h2>
            <p className="ticket-venue-detail">{selected?.detail || venueAddress}</p>

            {isCancelled && (
              <div className="ticket-refund-notice" style={{
                background: "#fef3c7",
                border: "1px solid #fcd34d",
                color: "#92400e",
                padding: "12px 16px",
                borderRadius: "10px",
                fontSize: "13px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px"
              }}>
                <span style={{ fontSize: "18px", lineHeight: 1 }}>⏳</span>
                <div>
                  <strong style={{ display: "block", marginBottom: 2 }}>Cancellation Refund in Progress</strong>
                  <p style={{ margin: 0, color: "#78350f", lineHeight: 1.4 }}>
                    Ticket cancelled. A full refund of <strong>₹{totalAmount.toLocaleString("en-IN")}</strong> can be initiated within 24 hours and will be credited to your original payment method. Ref: <code>{paymentRef}</code>
                  </p>
                </div>
              </div>
            )}

            <div className="ticket-info-grid">
              <div className="ticket-cell">
                <span className="ticket-cell-label">BOOKING ID</span>
                <b>#{bookingId}</b>
              </div>
              {!isCancelled && (
                <div className="ticket-cell">
                  <span className="ticket-cell-label">ENTRY GATE</span>
                  <b>GATE A / MAIN</b>
                </div>
              )}
              <div className="ticket-cell">
                <span className="ticket-cell-label">{isCancelled ? "REFUND AMOUNT" : "AMOUNT PAID"}</span>
                <b>₹{totalAmount.toLocaleString("en-IN")}</b>
              </div>
              <div className="ticket-cell">
                <span className="ticket-cell-label">{isCancelled ? "REFUND STATUS" : "PAYMENT MODE"}</span>
                <b>{isCancelled ? "Refund can be initiated within 24 hours" : method}</b>
              </div>
              <div className="ticket-cell" style={{ gridColumn: "1 / -1" }}>
                <span className="ticket-cell-label">PAYMENT REFERENCE ID</span>
                <b style={{ fontFamily: "monospace", color: "#3730a3", fontSize: "13px" }}>{paymentRef}</b>
              </div>
            </div>

            {/* If NOT cancelled, show barcode strip with turnstile entry code. If cancelled, do NOT show entry code or scan instructions */}
            {!isCancelled && (
              <div className="ticket-barcode-strip">
                <span className="ticket-entry-code">ENTRY CODE: {entryCode}</span>
                <p className="ticket-scan-hint">
                  Show this official backend QR code at turnstile or operator scanner.
                </p>
              </div>
            )}

            {/* Backend Location Card */}
            <div className="ticket-location-card">
              <div className="ticket-location-header">
                <span className="ticket-loc-icon">📍</span>
                <div>
                  <span className="ticket-loc-label">VENUE LOCATION</span>
                  <div className="ticket-loc-address">{venueAddress}</div>
                  {venueCityState && <div className="ticket-loc-city">{venueCityState}</div>}
                </div>
              </div>

              {location?.latitude && location?.longitude && (
                <div className="ticket-coords-badge">
                  <span>🌐 Lat: {location.latitude.toFixed(4)}°, Lng: {location.longitude.toFixed(4)}°</span>
                </div>
              )}
            </div>
          </div>

          <div className="ticket-notch-divider">
            <div className="notch top" />
            <div className="dashed-line" />
            <div className="notch bottom" />
          </div>

          <div className="ticket-qr-section">
            {isCancelled ? (
              <div className="ticket-void-section">
                <div className="ticket-void-stamp">🚫 CANCELLED</div>
                <span className="ticket-void-sub">QR Code Disabled<br/>Ticket Invalid for Entry</span>
              </div>
            ) : (
              <div className="ticket-qr-box">
                <img
                  src={qrImageUrl}
                  alt={`Turnstile Entry Pass QR for Booking #${bookingId}`}
                  className="ticket-qr-img"
                  loading="eager"
                />
                <span className="ticket-qr-sub">Scan at Gate</span>
                <span className="ticket-qr-backend-badge">Backend Verified</span>
              </div>
            )}
            <div className="ticket-txn-meta">
              <span><b>Payment Ref:</b> {paymentRef}</span>
              <span><b>Txn ID:</b> {txnId}</span>
              {!isCancelled && <span><b>UTR:</b> {utr}</span>}
            </div>
          </div>
        </div>

        {/* SportsHub Companion Section: only show route and companion for active tickets, not cancelled tickets */}
        {!isCancelled && (
          <SportsHubCompanion
            location={location}
            eventTitle={selected?.title || location?.venueName || "Sports Event"}
            visitDate={selected?.visitDate || booking?.items?.[0]?.visitDate}
            startHour={selected?.startHour ?? booking?.items?.[0]?.startHour ?? 19}
          />
        )}

        {/* Footer actions */}
        <div className="ticket-footer" style={{ flexWrap: "wrap", gap: 10 }}>
          {!isCancelled && (
            <>
              <button
                type="button"
                className="btn primary ticket-download-btn"
                style={{ background: "#16a34a", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={() =>
                  downloadTicketPass({
                    bookingId,
                    entryCode,
                    venueName,
                    venueAddress,
                    venueDetail: selected?.detail || venueAddress,
                    customerName: paymentResult?.receipt?.customerName || booking?.customerName || "SportsHub Guest",
                    totalAmount,
                    paymentMethod: method,
                    txnId,
                    qrImageUrl,
                  })
                }
              >
                📥 Download Ticket
              </button>

              <button
                type="button"
                className="btn ticket-download-qr-btn"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={() =>
                  downloadQrImage({
                    bookingId,
                    qrImageUrl,
                  })
                }
              >
                🖼️ Download QR
              </button>
            </>
          )}

          <button
            type="button"
            className="btn secondary ticket-print-btn"
            onClick={() => window.print()}
          >
            🖨️ Print Receipt
          </button>

          <button
            type="button"
            className="btn ticket-done-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
