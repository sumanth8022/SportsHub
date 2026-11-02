import React, { useEffect, useState, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./SportsHubCompanion.css";

// WMO Weather code helper
function getWeatherInfo(code) {
  switch (code) {
    case 0:
      return { condition: "Clear Sky", icon: "☀️", isRainy: false };
    case 1:
    case 2:
      return { condition: "Partly Cloudy", icon: "🌤️", isRainy: false };
    case 3:
      return { condition: "Overcast", icon: "☁️", isRainy: false };
    case 45:
    case 48:
      return { condition: "Foggy", icon: "🌫️", isRainy: false };
    case 51:
    case 53:
    case 55:
      return { condition: "Drizzle", icon: "🌦️", isRainy: true };
    case 61:
    case 63:
    case 65:
      return { condition: "Rain Showers", icon: "🌧️", isRainy: true };
    case 71:
    case 73:
    case 75:
      return { condition: "Snowfall", icon: "❄️", isRainy: false };
    case 80:
    case 81:
    case 82:
      return { condition: "Heavy Rain", icon: "🌧️", isRainy: true };
    case 95:
    case 96:
    case 99:
      return { condition: "Thunderstorm", icon: "⛈️", isRainy: true };
    default:
      return { condition: "Fair Weather", icon: "⛅", isRainy: false };
  }
}

// Haversine formula fallback
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1.3 * 10) / 10; // 1.3 road circuity factor
}

// Calculate distinct, realistic travel-time and distance for each mode in Indian urban traffic
function calculateModeMetrics(mode, baseDistanceKm, baseDrivingMinutes) {
  const baseKm = Math.max(0.4, Number(baseDistanceKm) || 5);
  // Realistic urban city car driving speed ~24 km/h (accounts for city traffic signals and congestion)
  // OSRM provides highway free-flow speed, which in dense city traffic takes ~2.1x - 2.2x longer
  const carMins = Math.max(
    3,
    Math.round(
      baseDrivingMinutes
        ? Math.max((baseKm / 24) * 60, baseDrivingMinutes * 2.15)
        : (baseKm / 24) * 60
    )
  );

  switch (mode) {
    case "two-wheeler": {
      // 🛵 Bike: filters through city congestion & red-light queues (~30 km/h)
      const bikeDistance = Math.round(baseKm * 0.97 * 10) / 10;
      let bikeMins = Math.max(2, Math.round((bikeDistance / 30) * 60));
      // In Indian city traffic, a nimble bike weaves through jams and arrives faster than a car
      if (bikeMins >= carMins && carMins > 3) {
        bikeMins = Math.max(2, carMins - 4);
      }
      return {
        distanceKm: bikeDistance,
        durationMinutes: bikeMins,
      };
    }
    case "transit": {
      // 🚌 Transit: metro / bus with fixed routes, station stops, and transfer overhead (~19 km/h + 7 min wait)
      const transitDistance = Math.round(baseKm * 1.14 * 10) / 10;
      const transitMins = Math.round((transitDistance / 19) * 60) + 7;
      return {
        distanceKm: transitDistance,
        durationMinutes: Math.max(carMins + 8, transitMins),
      };
    }
    case "walking": {
      // 🚶 Walking: pedestrian shortcuts, walking speed ~4.8 km/h (~12.5 mins per km)
      const walkDistance = Math.round(baseKm * 0.92 * 10) / 10;
      const walkMins = Math.round((walkDistance / 4.8) * 60);
      return {
        distanceKm: walkDistance,
        durationMinutes: Math.max(5, walkMins),
      };
    }
    case "driving":
    default: {
      // 🚗 Car / Cab: realistic city driving time
      return {
        distanceKm: Math.round(baseKm * 10) / 10,
        durationMinutes: carMins,
      };
    }
  }
}

export default function SportsHubCompanion({
  location,
  eventTitle = "Sports Event",
  visitDate,
  startHour = 19,
}) {
  const destLat = location?.latitude || 17.385;
  const destLng = location?.longitude || 78.4867;
  const venueName = location?.venueName || "SportsHub Venue";

  // 1. User Location State
  const [userLocation, setUserLocation] = useState(() => ({
    lat: destLat - 0.038,
    lng: destLng - 0.035,
    isLive: false,
    label: "Nearby City Origin",
    error: null,
  }));
  const [locating, setLocating] = useState(false);

  // 2. Travel Mode: 'driving' | 'two-wheeler' | 'transit' | 'walking'
  const [travelMode, setTravelMode] = useState("driving");

  // 3. Base Route State (road polyline & base driving metrics)
  const [baseRoute, setBaseRoute] = useState({
    distanceKm: 0,
    durationMinutes: 0,
    polyline: [],
    loading: true,
  });

  // Calculate active mode metrics instantly whenever travelMode or baseRoute changes
  const activeMetrics = useMemo(() => {
    return calculateModeMetrics(travelMode, baseRoute.distanceKm, baseRoute.durationMinutes);
  }, [travelMode, baseRoute.distanceKm, baseRoute.durationMinutes]);

  const routeData = useMemo(() => {
    return {
      distanceKm: activeMetrics.distanceKm,
      durationMinutes: activeMetrics.durationMinutes,
      polyline: baseRoute.polyline,
      loading: baseRoute.loading,
    };
  }, [activeMetrics, baseRoute.polyline, baseRoute.loading]);

  // 4. Weather State
  const [weather, setWeather] = useState({
    tempC: 27,
    feelsLikeC: 28,
    condition: "Partly Cloudy",
    icon: "🌤️",
    humidity: 62,
    windKph: 14,
    rainProb: 15,
    matchForecast: null,
    loading: false,
  });
  const [useFahrenheit, setUseFahrenheit] = useState(false);

  // 5. Leaflet Map Ref
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerGroupRef = useRef(null);

  // Request GPS location
  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      setUserLocation((prev) => ({ ...prev, error: "Geolocation not supported by browser" }));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          isLive: true,
          label: "Your Live Location (GPS)",
          error: null,
        });
        setLocating(false);
      },
      (err) => {
        console.warn("Geolocation denied or timed out:", err.message);
        setUserLocation((prev) => ({
          ...prev,
          isLive: false,
          error: "Permission denied. Using default location.",
        }));
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Fetch Live Route from OSRM
  useEffect(() => {
    let active = true;
    const fetchRoute = async () => {
      setBaseRoute((prev) => ({ ...prev, loading: true }));
      const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${destLng},${destLat}?overview=full&geometries=geojson`;

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("OSRM routing returned status " + res.status);
        const data = await res.json();
        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          const r = data.routes[0];
          const distanceKm = Math.round((r.distance / 1000) * 10) / 10;
          const durationMinutes = Math.max(1, Math.round(r.duration / 60));

          // GeoJSON coordinates [lng, lat] -> Leaflet [lat, lng]
          const polyline = (r.geometry?.coordinates || []).map((c) => [c[1], c[0]]);

          if (active) {
            setBaseRoute({
              distanceKm,
              durationMinutes,
              polyline,
              loading: false,
            });
          }
          return;
        }
      } catch (e) {
        console.warn("OSRM routing failed, using fallback:", e);
      }

      // Fallback calculation
      const dist = haversineDistanceKm(userLocation.lat, userLocation.lng, destLat, destLng);
      const fallbackDuration = Math.max(2, Math.round((dist / 42) * 60));

      if (active) {
        setBaseRoute({
          distanceKm: dist,
          durationMinutes: fallbackDuration,
          polyline: [
            [userLocation.lat, userLocation.lng],
            [(userLocation.lat + destLat) / 2, (userLocation.lng + destLng) / 2 + 0.005],
            [destLat, destLng],
          ],
          loading: false,
        });
      }
    };

    fetchRoute();
    return () => {
      active = false;
    };
  }, [userLocation.lat, userLocation.lng, destLat, destLng]);

  // Fetch Live Weather from Open-Meteo
  useEffect(() => {
    let active = true;
    const fetchWeather = async () => {
      setWeather((prev) => ({ ...prev, loading: true }));
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${destLat}&longitude=${destLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&forecast_days=2&timezone=auto`;

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Open-Meteo error " + res.status);
        const data = await res.json();

        if (active && data.current) {
          const cur = data.current;
          const wInfo = getWeatherInfo(cur.weather_code);

          // Find forecast for event hour if available
          let matchOutlook = null;
          if (data.hourly && data.hourly.time && data.hourly.time.length > 0) {
            const targetHour = typeof startHour === "number" ? startHour : 19;
            const hourIndex = data.hourly.time.findIndex((t) => {
              const d = new Date(t);
              return d.getHours() === targetHour;
            });
            if (hourIndex >= 0) {
              const hTemp = Math.round(data.hourly.temperature_2m[hourIndex]);
              const hRain = data.hourly.precipitation_probability ? data.hourly.precipitation_probability[hourIndex] : 0;
              const hInfo = getWeatherInfo(data.hourly.weather_code[hourIndex]);
              matchOutlook = {
                hour: targetHour,
                tempC: hTemp,
                condition: hInfo.condition,
                icon: hInfo.icon,
                rainProb: hRain,
              };
            }
          }

          setWeather({
            tempC: Math.round(cur.temperature_2m * 10) / 10,
            feelsLikeC: Math.round(cur.apparent_temperature * 10) / 10,
            condition: wInfo.condition,
            icon: wInfo.icon,
            humidity: Math.round(cur.relative_humidity_2m),
            windKph: Math.round(cur.wind_speed_10m),
            rainProb: cur.precipitation > 0 ? 80 : 10,
            matchForecast: matchOutlook,
            loading: false,
          });
        }
      } catch (err) {
        console.warn("Live weather fetch failed, using fallback:", err);
        if (active) {
          setWeather((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    fetchWeather();
    return () => {
      active = false;
    };
  }, [destLat, destLng, startHour]);

  // Leaflet Map Initialization & Updates
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [destLat, destLng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      routeLayerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layerGroup = routeLayerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Venue Marker
    const venueIcon = L.divIcon({
      className: "sh-custom-marker-icon",
      html: `<div class="sh-marker-pin sh-marker-venue" title="${venueName}">🏟️</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
    const venueMarker = L.marker([destLat, destLng], { icon: venueIcon }).addTo(layerGroup);
    venueMarker.bindPopup(`<b>${venueName}</b><br/><small>${location?.city || "Venue Location"}</small>`);

    // 2. User Location Marker
    const userIconEmoji = travelMode === "walking" ? "🚶" : travelMode === "two-wheeler" ? "🛵" : travelMode === "transit" ? "🚌" : "🚗";
    const userMarkerIcon = L.divIcon({
      className: "sh-custom-marker-icon",
      html: `<div class="sh-marker-pin sh-marker-user" title="${userLocation.label}">${userIconEmoji}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
    const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userMarkerIcon }).addTo(layerGroup);
    userMarker.bindPopup(`<b>${userLocation.label}</b><br/><small>Route Origin</small>`);

    // 3. Route Polyline
    if (routeData.polyline && routeData.polyline.length > 0) {
      const polyline = L.polyline(routeData.polyline, {
        color: "#4f46e5",
        weight: 5,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layerGroup);

      const bounds = L.latLngBounds(routeData.polyline);
      bounds.extend([userLocation.lat, userLocation.lng]);
      bounds.extend([destLat, destLng]);
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
    } else {
      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [destLat, destLng],
      ]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [destLat, destLng, userLocation.lat, userLocation.lng, userLocation.label, venueName, routeData.polyline, travelMode]);

  // Clean up map instance on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Dynamic Fare Calculations for Rides
  const rideFares = useMemo(() => {
    const km = Math.max(routeData.distanceKm || 5, 1);
    const bikeMin = Math.max(25, Math.round(20 + km * 9));
    const bikeMax = Math.round(bikeMin * 1.25);
    const autoMin = Math.max(35, Math.round(32 + km * 13));
    const autoMax = Math.round(autoMin * 1.25);
    const goMin = Math.max(65, Math.round(60 + km * 17));
    const goMax = Math.round(goMin * 1.28);
    const premierMin = Math.max(95, Math.round(90 + km * 24));
    const premierMax = Math.round(premierMin * 1.3);

    const encodedName = encodeURIComponent(venueName);
    const uberUrl = `https://m.uber.com/looking?dropoff[latitude]=${destLat}&dropoff[longitude]=${destLng}&dropoff[nickname]=${encodedName}&pickup[latitude]=${userLocation.lat}&pickup[longitude]=${userLocation.lng}`;
    const olaUrl = `https://book.olacabs.com/?lat=${userLocation.lat}&lng=${userLocation.lng}&drop_lat=${destLat}&drop_lng=${destLng}&drop_name=${encodedName}`;
    const rapidoUrl = `https://m.rapido.bike/booking?pickup_lat=${userLocation.lat}&pickup_lng=${userLocation.lng}&drop_lat=${destLat}&drop_lng=${destLng}&destination=${encodedName}`;

    return [
      {
        provider: "uber",
        name: "Uber Auto / Go",
        tier: "Fast Auto or AC Hatchback",
        fare: `₹${autoMin} - ₹${goMax}`,
        eta: "3-5 mins",
        url: uberUrl,
      },
      {
        provider: "ola",
        name: "Ola Mini / Prime",
        tier: "Comfortable City Sedan",
        fare: `₹${goMin - 5} - ₹${premierMax}`,
        eta: "4-6 mins",
        url: olaUrl,
      },
      {
        provider: "rapido",
        name: "Rapido Bike / Auto",
        tier: "Quickest in Traffic & Budget",
        fare: `₹${bikeMin} - ₹${autoMax}`,
        eta: "2-4 mins",
        url: rapidoUrl,
      },
    ];
  }, [routeData.distanceKm, destLat, destLng, venueName, userLocation.lat, userLocation.lng]);

  const displayTemp = useFahrenheit
    ? `${Math.round((weather.tempC * 9) / 5 + 32)}°F`
    : `${weather.tempC}°C`;
  const displayFeelsLike = useFahrenheit
    ? `${Math.round((weather.feelsLikeC * 9) / 5 + 32)}°F`
    : `${weather.feelsLikeC}°C`;

  return (
    <div className="sh-companion-section">
      {/* Header with Live Status */}
      <div className="sh-companion-header">
        <div>
          <div className="sh-companion-badge-row">
            <span className="sh-companion-badge">🧭 Matchday Companion</span>
            <span className="sh-companion-live-pulse">
              <span className="sh-pulse-dot" /> Live Route &amp; Weather
            </span>
          </div>
          <h3>{venueName}</h3>
          <p className="sh-companion-sub">
            Navigate to {location?.area || location?.city || "venue"} · Real-time travel logistics &amp; micro-climate
          </p>
        </div>

        <button
          type="button"
          className={`sh-location-btn ${userLocation.isLive ? "active" : ""}`}
          onClick={handleGetLiveLocation}
          disabled={locating}
          title="Use device GPS to calculate exact route from where you are"
        >
          {locating ? "⏳ Locating..." : userLocation.isLive ? "✓ Live GPS Active" : "📍 Locate Me (GPS)"}
        </button>
      </div>

      {/* Travel Mode Selector */}
      <div className="sh-travel-modes-grid" role="group" aria-label="Travel Modes">
        {[
          { id: "driving", label: "Car / Cab", icon: "🚗", desc: "Fastest road" },
          { id: "two-wheeler", label: "Bike", icon: "🛵", desc: "Filters traffic" },
          { id: "transit", label: "Transit", icon: "🚌", desc: "Metro / Bus" },
          { id: "walking", label: "Walking", icon: "🚶", desc: "Pedestrian" },
        ].map((m) => {
          const isActive = travelMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className={`sh-travel-mode-btn ${isActive ? "active" : ""}`}
              onClick={() => setTravelMode(m.id)}
            >
              <span className="sh-travel-mode-icon">{m.icon}</span>
              <span className="sh-travel-mode-label">{m.label}</span>
              <span className="sh-travel-mode-desc">{m.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Route Metrics Summary */}
      <div className="sh-metrics-bar">
        <div className="sh-metric-item">
          <span className="sh-metric-label">DISTANCE</span>
          <span className="sh-metric-val highlight">{routeData.distanceKm} km</span>
        </div>
        <div className="sh-metric-item">
          <span className="sh-metric-label">ESTIMATED TIME</span>
          <span className="sh-metric-val highlight">
            {routeData.durationMinutes >= 60
              ? `${Math.floor(routeData.durationMinutes / 60)}h ${routeData.durationMinutes % 60}m`
              : `${routeData.durationMinutes} mins`}
          </span>
        </div>
        <div className="sh-metric-item" style={{ flexGrow: 1 }}>
          <span className="sh-metric-label">ROUTE ORIGIN</span>
          <span className="sh-origin-info">
            {userLocation.isLive ? "📡 GPS Location" : "📍 Default Nearby Origin"}
            <small style={{ color: "#94a3b8" }}>({userLocation.lat.toFixed(3)}°, {userLocation.lng.toFixed(3)}°)</small>
          </span>
        </div>
      </div>

      {/* 1. Interactive Leaflet Map */}
      <div className="sh-map-container-wrapper">
        <div className="sh-map-overlay-badge">
          🗺️ Interactive Map · Route to {venueName}
        </div>
        <div ref={mapContainerRef} className="sh-leaflet-map-element" />
      </div>

      {/* 2. Hyper-Local Matchday Weather Card */}
      <div className="sh-weather-card">
        <div className="sh-weather-top-row">
          <div className="sh-weather-station-tag">
            <span>📡 Venue Micro-Station Weather</span>
            <small style={{ color: "#64748b" }}>({location?.city || "Local"})</small>
          </div>
          <button
            type="button"
            className="sh-temp-toggle-btn"
            onClick={() => setUseFahrenheit(!useFahrenheit)}
          >
            Switch to {useFahrenheit ? "°C" : "°F"}
          </button>
        </div>

        <div className="sh-weather-main-grid">
          <div className="sh-weather-primary">
            <span className="sh-weather-emoji-huge">{weather.icon}</span>
            <div>
              <div className="sh-weather-temp-num">{displayTemp}</div>
              <div className="sh-weather-cond-text">{weather.condition}</div>
            </div>
          </div>

          <div className="sh-weather-details-grid">
            <div className="sh-weather-mini-stat">
              <span className="sh-weather-stat-label">Feels Like</span>
              <span className="sh-weather-stat-val">{displayFeelsLike}</span>
            </div>
            <div className="sh-weather-mini-stat">
              <span className="sh-weather-stat-label">Humidity</span>
              <span className="sh-weather-stat-val">{weather.humidity}%</span>
            </div>
            <div className="sh-weather-mini-stat">
              <span className="sh-weather-stat-label">Wind</span>
              <span className="sh-weather-stat-val">{weather.windKph} km/h</span>
            </div>
          </div>
        </div>

        {weather.matchForecast && (
          <div className="sh-match-forecast-alert">
            <span>{weather.matchForecast.icon}</span>
            <span>
              <b>Matchday Forecast ({weather.matchForecast.hour}:00):</b>{" "}
              {useFahrenheit
                ? `${Math.round((weather.matchForecast.tempC * 9) / 5 + 32)}°F`
                : `${weather.matchForecast.tempC}°C`}{" "}
              · {weather.matchForecast.condition} · Rain risk: {weather.matchForecast.rainProb}%
            </span>
          </div>
        )}
      </div>

      {/* 3. Ride Hailing Options */}
      <div className="sh-rides-card">
        <div className="sh-rides-head">
          <h4>🚕 Book a Ride to Venue</h4>
          <span>Direct in-app deep links · ~{routeData.distanceKm} km</span>
        </div>

        <div className="sh-rides-grid">
          {rideFares.map((ride) => (
            <div key={ride.provider} className="sh-ride-box">
              <div className="sh-ride-top">
                <span className="sh-ride-provider-name">
                  {ride.provider === "uber" ? "🚗 Uber" : ride.provider === "ola" ? "🟡 Ola" : "🛵 Rapido"}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a" }}>{ride.eta}</span>
              </div>
              <div className="sh-ride-service-tag">{ride.tier}</div>
              <div className="sh-ride-fare-row">
                <span className="sh-ride-fare-label">ESTIMATED FARE</span>
                <div className="sh-ride-fare-amount">{ride.fare}</div>
              </div>
              <button
                type="button"
                className={`sh-ride-book-btn ${ride.provider}`}
                onClick={() => window.open(ride.url, "_blank", "noopener,noreferrer")}
              >
                Book with {ride.provider === "uber" ? "Uber" : ride.provider === "ola" ? "Ola" : "Rapido"} →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

