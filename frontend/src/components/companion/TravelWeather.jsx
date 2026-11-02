import React from "react";
import SportsHubCompanion from "./SportsHubCompanion.jsx";
import "./SportsHubCompanion.css";

export default function TravelWeather({ place, date, hour, visitLabel, onClose }) {
  const location = {
    venueName: place?.name,
    area: place?.area || place?.sub,
    city: place?.city,
    latitude: place?.latitude || place?.lat || 17.4401,
    longitude: place?.longitude || place?.lng || 78.3489,
  };

  return (
    <div
      className="booking-overlay"
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10001,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          maxWidth: 640,
          width: "100%",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          position: "relative",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 16,
            zIndex: 1000,
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "50%",
            width: 32,
            height: 32,
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#475569",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
          aria-label="Close Travel & Weather"
        >
          ✕
        </button>
        <SportsHubCompanion
          location={location}
          eventTitle={place?.name || "Sports Event"}
          visitDate={date}
          startHour={hour || 19}
        />
      </div>
    </div>
  );
}
