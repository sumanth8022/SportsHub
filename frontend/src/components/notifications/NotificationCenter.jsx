import React, { useState, useEffect } from "react";
import "./NotificationCenter.css";

export default function NotificationCenter({ notifications, onMarkAllRead, onClear, onAddNotification }) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const mockLiveEvents = [
    {
      type: "event",
      title: "🏏 Cricket Derby: Gates Open!",
      message: "Chinnaswamy Stadium gates have opened early. Fast-track entry active for mobile QR passes.",
      severity: "info",
    },
    {
      type: "weather",
      title: "🌤️ Turf Weather Update",
      message: "Bengaluru & Hyderabad evening turf conditions are optimal (22°C, mild breeze, dry pitch).",
      severity: "success",
    },
    {
      type: "event",
      title: "⚽ Football Derby: Kickoff Alert",
      message: "Kickoff Park 5-a-side match begins in 45 minutes. Floodlights and bibs ready.",
      severity: "info",
    },
    {
      type: "alert",
      title: "⚡ Dink House: Special Court Upgrade",
      message: "Court 1 pickleball tournament surface now rated Grade-A by National Pickleball League.",
      severity: "warning",
    },
  ];

  const triggerMockEvent = () => {
    const randomEvent = mockLiveEvents[Math.floor(Math.random() * mockLiveEvents.length)];
    onAddNotification({
      ...randomEvent,
      timestamp: "Just now",
      read: false,
    });
  };

  return (
    <div className="notif-wrapper">
      {/* Bell Button */}
      <button
        type="button"
        className={`notif-bell-btn ${unreadCount > 0 ? "has-unread" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        title="Event Updates & Alerts"
      >
        <span className="notif-bell-icon">🔔</span>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div className="notif-backdrop" onClick={() => setIsOpen(false)} />
          <div className="notif-panel">
            <div className="notif-panel-header">
              <div className="notif-title-row">
                <h4>Event & Booking Updates</h4>
                {unreadCount > 0 && <span className="notif-unread-tag">{unreadCount} new</span>}
              </div>
              <div className="notif-header-actions">
                <button type="button" className="notif-text-btn" onClick={onMarkAllRead}>
                  Mark read
                </button>
                <button type="button" className="notif-text-btn" onClick={onClear}>
                  Clear
                </button>
              </div>
            </div>

            {/* List */}
            <div className="notif-list">
              {notifications.length === 0 ? (
                <div className="notif-empty">
                  <span>✨</span>
                  <p>No new notifications</p>
                  <small>Event updates and payment statuses will appear here.</small>
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`notif-item ${n.read ? "read" : "unread"} ${n.severity || "info"}`}>
                    <div className="notif-item-icon">
                      {n.type === "payment_success" && "✓"}
                      {n.type === "payment_failed" && "✕"}
                      {n.type === "payment_processing" && "🔄"}
                      {n.type === "weather" && "🌤️"}
                      {n.type === "event" && "🏟️"}
                      {n.type === "alert" && "⚡"}
                      {n.type === "hold" && "⏳"}
                      {!["payment_success", "payment_failed", "payment_processing", "weather", "event", "alert", "hold"].includes(n.type) && "📢"}
                    </div>
                    <div className="notif-item-body">
                      <div className="notif-item-top">
                        <b>{n.title}</b>
                        <span className="notif-item-time">{n.timestamp}</span>
                      </div>
                      <p>{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Global Toast Container Component
export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-card ${t.type || "info"}`}>
          <div className="toast-icon">
            {t.type === "success" && "✓"}
            {t.type === "error" && "✕"}
            {t.type === "warning" && "⚠️"}
            {t.type === "event" && "🏟️"}
            {t.type === "info" && "ℹ️"}
          </div>
          <div className="toast-content">
            <b>{t.title}</b>
            <p>{t.message}</p>
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

