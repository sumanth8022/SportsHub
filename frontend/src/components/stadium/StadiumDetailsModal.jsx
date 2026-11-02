import React from "react";
import { getStadiumDetails } from "../../data/stadiumData";
import "./StadiumDetailsModal.css";

function inr(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

function hourSp(h) {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function dayText(d) {
  if (!d) return "";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export default function StadiumDetailsModal({
  stadium,
  dates,
  onBookTickets,
  onTravel,
  onClose,
}) {
  const details = getStadiumDetails(stadium);
  const events = stadium.events || [];
  const stands = stadium.stands || [];

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="stadium-details-card" onClick={(e) => e.stopPropagation()}>
        {/* Hero Image & Header */}
        <div
          className="stadium-details-hero"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.95) 100%), url(${details.image})` }}
        >
          <button className="close-btn-corner" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
          <div className="hero-content">
            <div className="hero-badges">
              <span className="badge city-badge">📍 {details.city}</span>
              <span className="badge sport-badge">🏏 Cricket</span>
              <span className="badge rating-badge">★ {details.rating} ({details.reviewsCount.toLocaleString()} reviews)</span>
            </div>
            <h2 className="stadium-name">{details.name}</h2>
            <p className="stadium-address">{details.address}</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="stadium-details-body">
          {/* Key Stats Bar */}
          <div className="details-stats-bar">
            <div className="stat-item">
              <span className="stat-label">Capacity</span>
              <span className="stat-num">{details.capacity.toLocaleString()}</span>
              <span className="stat-sub">Spectators</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Starting Price</span>
              <span className="stat-num price-color">{inr(details.price || details.basePrice || 800)}</span>
              <span className="stat-sub">per ticket</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Home Ground</span>
              <span className="stat-num text-truncate">{details.homeTeam}</span>
              <span className="stat-sub">Est. {details.established || "2000"}</span>
            </div>
          </div>

          {/* Description & Highlights */}
          <div className="section-block">
            <h3>About the Arena</h3>
            <p className="about-text">{details.description}</p>
            <div className="highlights-tags">
              {details.highlights.map((h, i) => (
                <span key={i} className="highlight-tag">
                  ✓ {h}
                </span>
              ))}
            </div>
          </div>

          {/* Architectural Blueprint & Stand Layout */}
          <div className="section-block blueprint-block">
            <h3>📐 Architectural Blueprint &amp; Stand Layout</h3>
            <p className="about-text blueprint-text">{details.blueprint}</p>
          </div>

          {/* Upcoming Matches / Events */}
          <div className="section-block">
            <div className="section-header-flex">
              <h3>Upcoming Matches &amp; Events</h3>
              <span className="events-count-badge">{events.length} Scheduled</span>
            </div>
            {events.length === 0 ? (
              <p className="empty-events-text">No upcoming matches currently scheduled.</p>
            ) : (
              <div className="events-cards-grid">
                {events.map((ev, i) => {
                  const evDate = dates && ev.day != null ? dates[ev.day] : null;
                  return (
                    <div key={ev.id || i} className="event-item-card">
                      <div className="event-ball-icon">🏏</div>
                      <div className="event-info">
                        <h4>{ev.title}</h4>
                        <div className="event-time">
                          {evDate ? `${dayText(evDate)}, ${hourSp(ev.time)}` : "Upcoming match"}
                        </div>
                      </div>
                      <span className="event-action-hint">Gate Entry Pass</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Available Stands */}
          <div className="section-block">
            <h3>Available Stands &amp; Seating Tiers</h3>
            <div className="stands-preview-grid">
              {(stands.length > 0 ? stands : [
                { name: "North Stand", mult: 1.0 },
                { name: "South Stand", mult: 1.2 },
                { name: "East Stand", mult: 1.0 },
                { name: "West Stand", mult: 1.5 },
                { name: "VIP / Premium Stand", mult: 3.0 },
              ]).map((st, i) => (
                <div key={i} className="stand-badge-box">
                  <span className="stand-box-name">{st.name}</span>
                  <span className="stand-box-price">
                    from {inr(Math.round((details.price || 800) * (st.mult || st.priceMultiplier || 1)))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="stadium-details-footer">
          {onTravel && (
            <button
              className="btn-directions"
              onClick={(e) => {
                onClose();
                onTravel(e, stadium);
              }}
            >
              🧭 Get Directions / Travel
            </button>
          )}

          <div className="main-actions">
            
            <button
              className="btn-book-now"
              onClick={() => {
                onClose();
                onBookTickets(stadium);
              }}
            >
              Book Tickets →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

