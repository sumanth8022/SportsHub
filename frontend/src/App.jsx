import { useEffect, useMemo, useRef, useState } from "react";
import TravelWeather from "./components/companion/TravelWeather.jsx";
import PaymentGateway from "./components/booking/PaymentGateway.jsx";
import TicketPassModal from "./components/ticket/TicketPassModal.jsx";
import NotificationCenter, { ToastContainer } from "./components/notifications/NotificationCenter.jsx";
import StadiumDetailsModal from "./components/stadium/StadiumDetailsModal.jsx";
import { STADIUM_CITIES, getStadiumDetails } from "./data/stadiumData.js";
import MyBookings from "./components/bookings/MyBookings.jsx";
import "./components/stadium/StadiumCards.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const api = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { const body = await res.json(); message = body.message || message; } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
};

const buildDateFromIso = (iso) => { const d = new Date(iso); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const normalizeEvent = (e, dates) => {
  const d = buildDateFromIso(e.startsAt);
  let day = dates.findIndex(x => dateKey(x) === dateKey(d));
  if (day < 0) day = 0;
  return { id:e.id, title:e.title, day, time:new Date(e.startsAt).getHours(), startsAt:e.startsAt, capacity:e.capacity };
};

/* ---------- Demo data ---------- */
const SPORTS = {
  Cricket: { color: "#2f6bed", icon: "🏏" },
  Football: { color: "#1f9d55", icon: "⚽" },
  Badminton: { color: "#0f8f86", icon: "🏸" },
  Pickleball: { color: "#d96a0b", icon: "🏓" },
  Kabaddi: { color: "#a23b72", icon: "🤼" },
};

const PARK_CATS = {
  "Amusement park": { color: "#c03a3a", icon: "🎢" },
  "Water park": { color: "#0b7bb8", icon: "🌊" },
  "Adventure park": { color: "#5b7a12", icon: "🧗" },
  "Trampoline park": { color: "#7b45d6", icon: "🤸" },
  "Arcade zone": { color: "#2f4858", icon: "🎮" },
  "Garden park": { color: "#2f8f5b", icon: "🌳" },
  "Zoo & safari": { color: "#b7791f", icon: "🦁" },
  "Nature park": { color: "#8d5524", icon: "🦚" },
  "Theme park": { color: "#d6336c", icon: "🎠" },
};

const VENUES = [
  { id: 1, sport: "Cricket", name: "Gachibowli Turf Arena", city: "Hyderabad", sub: "Turf A", price: 1200, rating: 4.7, tags: ["Floodlights", "Parking", "Washrooms"] },
  { id: 2, sport: "Badminton", name: "Smash Point Courts", city: "Hyderabad", sub: "Court 2", price: 400, rating: 4.5, tags: ["Wooden floor", "Racket rental"] },
  { id: 3, sport: "Pickleball", name: "Dink House", city: "Hyderabad", sub: "Court 1", price: 600, rating: 4.6, tags: ["Outdoor", "Coaching"] },
  { id: 4, sport: "Football", name: "Kickoff Park", city: "Bengaluru", sub: "5-a-side", price: 1500, rating: 4.8, tags: ["Floodlights", "Cafe", "Parking"] },
  { id: 5, sport: "Cricket", name: "Boundary Box", city: "Bengaluru", sub: "Net lane 3", price: 1000, rating: 4.4, tags: ["Bowling machine", "Washrooms"] },
  { id: 6, sport: "Badminton", name: "Rally Club", city: "Mumbai", sub: "Court 4", price: 500, rating: 4.6, tags: ["AC hall", "Lockers"] },
  { id: 7, sport: "Pickleball", name: "Dink Social", city: "Mumbai", sub: "Court 2", price: 700, rating: 4.7, tags: ["Indoor", "Cafe"] },
  { id: 8, sport: "Kabaddi", name: "Raid Zone Arena", city: "Hyderabad", sub: "Mat 1", price: 800, rating: 4.5, tags: ["Mat court", "Coaching", "Washrooms"] },
];

const PARKS = [
  // Hyderabad
  { id: 101, cat: "Amusement park", name: "Wonderla Amusement Park", city: "Hyderabad", area: "Raviryal, ORR Exit 13", price: 1009, tags: ["Toddlers", "Kids", "Teens", "Family"] },
  { id: 102, cat: "Water park", name: "Wild Waters Theme Park", city: "Hyderabad", area: "Shankarpally", price: 1081, tags: ["Toddlers", "Kids", "Teens", "Family"] },
  { id: 103, cat: "Adventure park", name: "District Gravity", city: "Hyderabad", area: "Shamirpet, Leonia Resort", price: 499, tags: ["Kids", "Teens", "Family"] },
  { id: 104, cat: "Trampoline park", name: "Sky Zone", city: "Hyderabad", area: "Gandipet and Kokapet", price: 600, tags: ["Toddlers", "Kids", "Teens"] },
  { id: 105, cat: "Arcade zone", name: "Game Station", city: "Hyderabad", area: "HITEC City", price: 350, tags: ["Kids", "Teens", "Family"] },
  { id: 116, cat: "Garden park", name: "Lumbini Park", city: "Hyderabad", area: "Hussain Sagar, Tank Bund", price: 20, tags: ["Boating", "Musical fountain", "Family"] },
  { id: 117, cat: "Garden park", name: "Sanjeevaiah Park", city: "Hyderabad", area: "Necklace Road", price: 20, tags: ["Walking", "Lake view", "Family"] },
  { id: 118, cat: "Garden park", name: "NTR Gardens", city: "Hyderabad", area: "Necklace Road", price: 15, tags: ["Kids", "Picnic", "Family"] },
  { id: 119, cat: "Garden park", name: "Indira Park", city: "Hyderabad", area: "Lower Tank Bund, Kavadiguda", price: 5, tags: ["Rock garden", "Boating", "Family"] },
  { id: 120, cat: "Garden park", name: "Hyderabad Botanical Garden", city: "Hyderabad", area: "Kondapur", price: 25, tags: ["Walking", "Plant lovers", "Family"] },
  { id: 121, cat: "Zoo & safari", name: "Nehru Zoological Park", city: "Hyderabad", area: "Bahadurpura", price: 50, tags: ["Kids", "Teens", "Family", "Closed Mondays"] },
  { id: 122, cat: "Nature park", name: "KBR National Park", city: "Hyderabad", area: "Jubilee Hills", price: 20, tags: ["Walking trails", "Birdwatching", "Family"] },
  { id: 123, cat: "Theme park", name: "Ramoji Film City", city: "Hyderabad", area: "Abdullapurmet, Hayathnagar", price: 1650, tags: ["Teens", "Family", "Studio tour"] },
  { id: 131, cat: "Amusement park", name: "Snow World", city: "Hyderabad", area: "Lower Tank Bund, Indira Park", price: 500, tags: ["Kids", "Teens", "Family"] },
  { id: 132, cat: "Water park", name: "Ocean Park", city: "Hyderabad", area: "Gandipet", price: 700, tags: ["Kids", "Teens", "Family"] },
  { id: 133, cat: "Water park", name: "Jalavihar", city: "Hyderabad", area: "Necklace Road", price: 650, tags: ["Toddlers", "Kids", "Family"] },
  { id: 134, cat: "Adventure park", name: "Rock and Rope Adventure", city: "Hyderabad", area: "Shamirpet", price: 650, tags: ["Kids", "Teens", "Family"] },
  { id: 135, cat: "Trampoline park", name: "Hop City", city: "Hyderabad", area: "Madhapur", price: 550, tags: ["Kids", "Teens"] },
  { id: 136, cat: "Arcade zone", name: "Pixel Palace", city: "Hyderabad", area: "Banjara Hills", price: 400, tags: ["Kids", "Teens", "Family"] },
  { id: 137, cat: "Garden park", name: "Public Gardens", city: "Hyderabad", area: "Nampally", price: 20, tags: ["Walking", "Picnic", "Family"] },
  { id: 138, cat: "Zoo & safari", name: "Mahavir Harina Vanasthali", city: "Hyderabad", area: "Vanasthalipuram", price: 20, tags: ["Deer park", "Kids", "Family"] },
  { id: 139, cat: "Nature park", name: "Mrugavani National Park", city: "Hyderabad", area: "Chilkur", price: 30, tags: ["Walking trails", "Birdwatching", "Family"] },
  { id: 140, cat: "Theme park", name: "Shilparamam", city: "Hyderabad", area: "Madhapur", price: 60, tags: ["Crafts", "Family", "Events"] },
  // Bengaluru
  { id: 106, cat: "Amusement park", name: "Wonderla Bengaluru", city: "Bengaluru", area: "Mysuru Road, Bidadi", price: 1239, tags: ["Toddlers", "Kids", "Teens", "Family"] },
  { id: 107, cat: "Water park", name: "Splash Valley", city: "Bengaluru", area: "Devanahalli", price: 899, tags: ["Toddlers", "Kids", "Family"] },
  { id: 108, cat: "Adventure park", name: "Treetop Trails", city: "Bengaluru", area: "Nandi Hills Road", price: 550, tags: ["Kids", "Teens", "Family"] },
  { id: 109, cat: "Trampoline park", name: "Bounce Arena", city: "Bengaluru", area: "Whitefield", price: 650, tags: ["Kids", "Teens"] },
  { id: 110, cat: "Arcade zone", name: "Arcade Alley", city: "Bengaluru", area: "Indiranagar", price: 400, tags: ["Kids", "Teens", "Family"] },
  { id: 124, cat: "Garden park", name: "Lalbagh Botanical Garden", city: "Bengaluru", area: "Mavalli, Lalbagh Road", price: 25, tags: ["Walking", "Glass house", "Family"] },
  { id: 125, cat: "Zoo & safari", name: "Bannerghatta Biological Park", city: "Bengaluru", area: "Bannerghatta Road", price: 80, tags: ["Safari", "Kids", "Family"] },
  { id: 126, cat: "Nature park", name: "Bannerghatta Butterfly Park", city: "Bengaluru", area: "Bannerghatta Road", price: 30, tags: ["Butterflies", "Kids", "Family"] },
  { id: 127, cat: "Theme park", name: "Innovative Film City", city: "Bengaluru", area: "Bidadi", price: 600, tags: ["Kids", "Teens", "Family"] },
  { id: 141, cat: "Amusement park", name: "Fun World", city: "Bengaluru", area: "Jayamahal Main Road, J.C. Nagar", price: 550, tags: ["Toddlers", "Kids", "Family"] },
  { id: 142, cat: "Amusement park", name: "Snow City", city: "Bengaluru", area: "Fun World Complex, J.C. Nagar", price: 500, tags: ["Kids", "Teens", "Family"] },
  { id: 143, cat: "Adventure park", name: "Canopy Quest", city: "Bengaluru", area: "Kanakapura Road", price: 600, tags: ["Kids", "Teens", "Family"] },
  { id: 144, cat: "Trampoline park", name: "Jump Nation", city: "Bengaluru", area: "HSR Layout", price: 600, tags: ["Kids", "Teens"] },
  { id: 145, cat: "Arcade zone", name: "Level Up Arcade", city: "Bengaluru", area: "Koramangala", price: 450, tags: ["Kids", "Teens", "Family"] },
  { id: 146, cat: "Garden park", name: "Lumbini Gardens", city: "Bengaluru", area: "Nagawara", price: 25, tags: ["Boating", "Picnic", "Family"] },
  { id: 147, cat: "Zoo & safari", name: "Bannerghatta Safari", city: "Bengaluru", area: "Bannerghatta Road", price: 300, tags: ["Safari", "Kids", "Family"] },
  // Mumbai
  { id: 111, cat: "Amusement park", name: "Imagica Theme Park", city: "Mumbai", area: "Khopoli, Mumbai-Pune Expressway", price: 1499, tags: ["Toddlers", "Kids", "Teens", "Family"] },
  { id: 112, cat: "Water park", name: "Aqua Imagica", city: "Mumbai", area: "Khopoli, Mumbai-Pune Expressway", price: 1199, tags: ["Kids", "Teens", "Family"] },
  { id: 113, cat: "Adventure park", name: "Peak Ropes", city: "Mumbai", area: "Lonavala", price: 700, tags: ["Kids", "Teens", "Family"] },
  { id: 114, cat: "Trampoline park", name: "Jump Yard", city: "Mumbai", area: "Andheri West", price: 750, tags: ["Toddlers", "Kids", "Teens"] },
  { id: 115, cat: "Arcade zone", name: "Game Haven", city: "Mumbai", area: "Lower Parel", price: 450, tags: ["Kids", "Teens", "Family"] },
  { id: 128, cat: "Zoo & safari", name: "Rani Baug (Byculla Zoo)", city: "Mumbai", area: "Byculla", price: 100, tags: ["Kids", "Family", "Penguins"] },
  { id: 129, cat: "Nature park", name: "Sanjay Gandhi National Park", city: "Mumbai", area: "Borivali East", price: 85, tags: ["Walking trails", "Kanheri Caves", "Family"] },
  { id: 148, cat: "Amusement park", name: "EsselWorld", city: "Mumbai", area: "Gorai", price: 1100, tags: ["Toddlers", "Kids", "Teens", "Family"] },
  { id: 149, cat: "Water park", name: "Water Kingdom", city: "Mumbai", area: "Gorai", price: 1310, tags: ["Toddlers", "Kids", "Teens", "Family"] },
  { id: 150, cat: "Adventure park", name: "Zipline Ridge", city: "Mumbai", area: "Karjat", price: 800, tags: ["Kids", "Teens", "Family"] },
  { id: 151, cat: "Trampoline park", name: "Bounce Planet", city: "Mumbai", area: "Powai", price: 700, tags: ["Kids", "Teens"] },
  { id: 152, cat: "Arcade zone", name: "Coin Corner", city: "Mumbai", area: "Malad", price: 500, tags: ["Kids", "Teens", "Family"] },
  { id: 153, cat: "Zoo & safari", name: "Lion and Tiger Safari", city: "Mumbai", area: "Borivali, Sanjay Gandhi National Park", price: 120, tags: ["Safari", "Kids", "Family"] },
  { id: 154, cat: "Nature park", name: "Maharashtra Nature Park", city: "Mumbai", area: "Dharavi", price: 50, tags: ["Walking trails", "Birdwatching", "Family"] },
  { id: 155, cat: "Theme park", name: "Film City", city: "Mumbai", area: "Goregaon East", price: 800, tags: ["Teens", "Family", "Studio tour"] },
];

// day = offset into the next 7 days, time = start hour (24h)
const STADIUMS = [
  // Hyderabad
  { id: 201, sport: "Cricket", name: "Rajiv Gandhi International Stadium", city: "Hyderabad", area: "Uppal", price: 800, tags: ["Floodlights", "Parking", "Food stalls"],
    events: [{ title: "T20 night match", day: 3, time: 19 }, { title: "One-day match", day: 6, time: 14 }] },
  { id: 202, sport: "Badminton", name: "Gachibowli Indoor Stadium", city: "Hyderabad", area: "Gachibowli", price: 400, tags: ["AC hall", "Parking"],
    events: [{ title: "Open badminton finals", day: 2, time: 17 }] },
  { id: 203, sport: "Football", name: "Gachibowli Athletic Stadium", city: "Hyderabad", area: "Gachibowli", price: 500, tags: ["Floodlights", "Parking", "Food stalls"],
    events: [{ title: "City league football", day: 4, time: 18 }] },
  { id: 210, sport: "Cricket", name: "Gymkhana Ground", city: "Hyderabad", area: "Secunderabad", price: 500, tags: ["Parking", "Food stalls"],
    events: [{ title: "Domestic one-day match", day: 2, time: 9 }] },
  { id: 211, sport: "Football", name: "LB Stadium", city: "Hyderabad", area: "Fateh Maidan, Nampally", price: 450, tags: ["Floodlights", "Parking"],
    events: [{ title: "City league football", day: 1, time: 18 }, { title: "Inter-club cup match", day: 6, time: 17 }] },
  { id: 212, sport: "Football", name: "Kickoff Arena", city: "Hyderabad", area: "Kondapur", price: 350, tags: ["Floodlights", "Cafe"],
    events: [{ title: "Five-a-side league night", day: 3, time: 20 }] },
  { id: 213, sport: "Badminton", name: "Gopichand Badminton Academy", city: "Hyderabad", area: "Gachibowli", price: 300, tags: ["AC hall", "Parking"],
    events: [{ title: "Inter-academy tournament", day: 3, time: 16 }] },
  { id: 214, sport: "Badminton", name: "Shuttle Hall", city: "Hyderabad", area: "Kukatpally", price: 250, tags: ["AC hall", "Cafe"],
    events: [{ title: "City badminton cup", day: 5, time: 17 }] },
  { id: 215, sport: "Kabaddi", name: "Telugu Kabaddi Dome", city: "Hyderabad", area: "Kukatpally", price: 450, tags: ["AC hall", "Parking"],
    events: [{ title: "Kabaddi league night", day: 5, time: 19 }] },
  { id: 216, sport: "Kabaddi", name: "Charminar Sports Arena", city: "Hyderabad", area: "Old City", price: 350, tags: ["Floodlights", "Food stalls"],
    events: [{ title: "Kabaddi knockout night", day: 2, time: 19 }] },
  // Bengaluru
  { id: 204, sport: "Cricket", name: "M. Chinnaswamy Stadium", city: "Bengaluru", area: "MG Road", price: 900, tags: ["Floodlights", "Metro nearby", "Food stalls"],
    events: [{ title: "T20 night match", day: 2, time: 19 }, { title: "Women's T20 match", day: 5, time: 14 }] },
  { id: 205, sport: "Football", name: "Sree Kanteerava Stadium", city: "Bengaluru", area: "Kasturba Road", price: 600, tags: ["Floodlights", "Metro nearby"],
    events: [{ title: "League football match", day: 1, time: 19 }, { title: "League football match", day: 5, time: 19 }] },
  { id: 206, sport: "Kabaddi", name: "Kanteerava Indoor Stadium", city: "Bengaluru", area: "Kasturba Road", price: 500, tags: ["AC hall", "Metro nearby"],
    events: [{ title: "Kabaddi league night", day: 3, time: 19 }] },
  { id: 217, sport: "Cricket", name: "KSCA Alur Cricket Ground", city: "Bengaluru", area: "Alur", price: 500, tags: ["Parking", "Food stalls"],
    events: [{ title: "Domestic one-day match", day: 4, time: 9 }] },
  { id: 218, sport: "Football", name: "Garden City Football Arena", city: "Bengaluru", area: "Whitefield", price: 500, tags: ["Floodlights", "Cafe", "Parking"],
    events: [{ title: "League football match", day: 3, time: 19 }] },
  { id: 219, sport: "Football", name: "Namma Turf Stadium", city: "Bengaluru", area: "Electronic City", price: 400, tags: ["Floodlights", "Parking"],
    events: [{ title: "Five-a-side league night", day: 6, time: 20 }] },
  { id: 220, sport: "Badminton", name: "Shuttle Dome", city: "Bengaluru", area: "Koramangala", price: 350, tags: ["AC hall", "Cafe"],
    events: [{ title: "State badminton championship", day: 2, time: 17 }] },
  { id: 221, sport: "Badminton", name: "Smash Arena", city: "Bengaluru", area: "HSR Layout", price: 300, tags: ["AC hall", "Parking"],
    events: [{ title: "Open badminton finals", day: 5, time: 16 }] },
  { id: 222, sport: "Kabaddi", name: "Whitefield Kabaddi Arena", city: "Bengaluru", area: "Whitefield", price: 450, tags: ["AC hall", "Parking"],
    events: [{ title: "Kabaddi league night", day: 6, time: 19 }] },
  { id: 223, sport: "Kabaddi", name: "Namma Raid Arena", city: "Bengaluru", area: "Yeshwanthpur", price: 350, tags: ["Floodlights", "Food stalls"],
    events: [{ title: "Kabaddi knockout night", day: 1, time: 19 }] },
  // Mumbai
  { id: 207, sport: "Cricket", name: "Wankhede Stadium", city: "Mumbai", area: "Churchgate", price: 1000, tags: ["Floodlights", "Station nearby", "Food stalls"],
    events: [{ title: "T20 night match", day: 1, time: 19 }, { title: "One-day match", day: 4, time: 14 }] },
  { id: 208, sport: "Football", name: "Mumbai Football Arena", city: "Mumbai", area: "Andheri West", price: 600, tags: ["Floodlights", "Cafe"],
    events: [{ title: "City league football", day: 2, time: 19 }] },
  { id: 209, sport: "Kabaddi", name: "NSCI Dome", city: "Mumbai", area: "Worli", price: 550, tags: ["AC hall", "Parking"],
    events: [{ title: "Kabaddi league night", day: 6, time: 19 }] },
  { id: 224, sport: "Cricket", name: "Brabourne Stadium", city: "Mumbai", area: "Churchgate", price: 900, tags: ["Floodlights", "Station nearby", "Food stalls"],
    events: [{ title: "T20 night match", day: 3, time: 19 }] },
  { id: 225, sport: "Cricket", name: "DY Patil Stadium", city: "Mumbai", area: "Nerul, Navi Mumbai", price: 800, tags: ["Floodlights", "Parking", "Food stalls"],
    events: [{ title: "T20 night match", day: 5, time: 19 }, { title: "Women's T20 match", day: 6, time: 14 }] },
  { id: 226, sport: "Football", name: "Cooperage Football Ground", city: "Mumbai", area: "Colaba", price: 400, tags: ["Floodlights", "Cafe"],
    events: [{ title: "Local league football", day: 4, time: 18 }] },
  { id: 227, sport: "Football", name: "Bandra Turf Stadium", city: "Mumbai", area: "Bandra West", price: 500, tags: ["Floodlights", "Cafe", "Parking"],
    events: [{ title: "Five-a-side league night", day: 1, time: 20 }] },
  { id: 228, sport: "Badminton", name: "Racquet Hall", city: "Mumbai", area: "Andheri East", price: 350, tags: ["AC hall", "Lockers"],
    events: [{ title: "City badminton cup", day: 5, time: 17 }] },
  { id: 229, sport: "Badminton", name: "Shuttle Court Arena", city: "Mumbai", area: "Powai", price: 300, tags: ["AC hall", "Parking"],
    events: [{ title: "Open badminton finals", day: 2, time: 16 }] },
  { id: 230, sport: "Kabaddi", name: "Sardar Vallabhbhai Patel Stadium", city: "Mumbai", area: "Worli", price: 500, tags: ["AC hall", "Parking"],
    events: [{ title: "Kabaddi league night", day: 3, time: 19 }] },
  { id: 231, sport: "Kabaddi", name: "Dadar Kabaddi Arena", city: "Mumbai", area: "Dadar", price: 350, tags: ["Floodlights", "Station nearby"],
    events: [{ title: "Kabaddi knockout night", day: 4, time: 19 }] },
  // Chennai
  { id: 240, sport: "Cricket", name: "MA Chidambaram Stadium (Chepauk)", city: "Chennai", area: "Chepauk", price: 950, tags: ["Floodlights", "Food stalls", "Outdoor", "Parking"],
    events: [{ title: "Chennai Super Kings vs Mumbai Indians", day: 3, time: 19 }, { title: "India vs South Africa - 2nd ODI", day: 6, time: 14 }] },
  // Pune
  { id: 241, sport: "Cricket", name: "Maharashtra Cricket Association Stadium", city: "Pune", area: "Gahunje", price: 850, tags: ["Floodlights", "Food stalls", "Parking"],
    events: [{ title: "India vs New Zealand - 3rd ODI", day: 4, time: 14 }, { title: "Maharashtra Premier League Grand Final", day: 7, time: 19 }] },
  // Kolkata
  { id: 242, sport: "Cricket", name: "Eden Gardens", city: "Kolkata", area: "BBD Bagh", price: 1100, tags: ["Floodlights", "Food stalls", "Outdoor", "Parking"],
    events: [{ title: "Kolkata Knight Riders vs Sunrisers Hyderabad", day: 3, time: 19 }, { title: "India vs Australia - World Series Super Clash", day: 6, time: 14 }] },
  // Delhi
  { id: 243, sport: "Cricket", name: "Arun Jaitley Stadium", city: "Delhi", area: "Bahadur Shah Zafar Marg", price: 950, tags: ["Floodlights", "Food stalls", "Outdoor", "Parking"],
    events: [{ title: "Delhi Capitals vs Mumbai Indians - IPL T20", day: 2, time: 19 }, { title: "India vs Australia - Border-Gavaskar Trophy", day: 5, time: 9 }] },
  // Andhra Pradesh (Visakhapatnam)
  { id: 244, sport: "Cricket", name: "Dr. Y.S. Rajasekhara Reddy ACA-VDCA Stadium", city: "Andhra Pradesh", area: "PM Palem, Visakhapatnam", price: 800, tags: ["Floodlights", "Food stalls", "Parking"],
    events: [{ title: "India vs South Africa - 1st T20I Clash", day: 3, time: 19 }, { title: "Delhi Capitals vs Sunrisers Hyderabad", day: 6, time: 19 }] },
];

const STANDS = [
  { id: 1, name: "North Stand", mult: 1.0 },
  { id: 2, name: "South Stand", mult: 1.2 },
  { id: 3, name: "VIP / Premium Stand", mult: 3.0 },
  { id: 4, name: "East Stand", mult: 1.0 },
  { id: 5, name: "West Stand", mult: 1.5 },
];

const TABS = ["Play", "Parks", "Stadium tickets", "My Bookings"];
const CITIES = ["All", "Hyderabad", "Bengaluru", "Mumbai"];
const FIRST_HOUR = 6;
const LAST_HOUR = 22; // last slot ends at 10 pm
const EVENING_FROM = 17;
const PREMIUM = 1.3;
const FEE_RATE = 0.02;

/* ---------- Helpers ---------- */
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

const hourLabel = (h) => {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${h < 12 ? "am" : "pm"}`;
};
const hourSp = (h) => hourLabel(h).replace(/(\d+)/, "$1 ");
const rangeLabel = (h) => {
  const a = hourLabel(h);
  const b = hourLabel(h + 1);
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -2)}-${b}` : `${a}-${b}`;
};

const dateKey = (d) => {
  if (!d) return "";
  try {
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  } catch (e) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
};
const dayText = (d) =>
  `${d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Asia/Kolkata" })}, ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}`;
const isWeekend = (d) => [0, 6].includes(d.getDay());

// Deterministic "booked" pattern so the demo looks the same on every render
const isBooked = (venueId, key, hour) => {
  let h = venueId * 97 + hour * 31;
  for (const c of key) h = (h * 33 + c.charCodeAt(0)) % 1009;
  return h % 5 === 0;
};

const slotPrice = (venue, date, hour) =>
  hour >= EVENING_FROM || isWeekend(date) ? Math.round(venue.price * PREMIUM) : venue.price;

const buildDates = () => {
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
};

/* ---------- Shared popup shell ---------- */
function Popup({ color, eyebrow, title, sub, label, onClose, children }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={label}>
        <div className="modal-head" style={{ background: color }}>
          <div>
            <div className="modal-sport">{eyebrow}</div>
            <h2>{title}</h2>
            <div className="modal-sub">{sub}</div>
          </div>
          <button ref={closeRef} className="close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function DateTabs({ dates, dayIdx, setDayIdx }) {
  return (
    <div className="dates" role="tablist">
      {dates.map((d, i) => (
        <button
          key={dateKey(d)}
          role="tab"
          aria-selected={i === dayIdx}
          className={"date" + (i === dayIdx ? " on" : "")}
          onClick={() => setDayIdx(i)}
        >
          {dayText(d)}
        </button>
      ))}
    </div>
  );
}

/* ---------- Ticket types: Adult / Child / Family ---------- */
const CHILD_RATE = 0.6; // child ticket = 60% of adult
const FAMILY_RATE = 0.9; // family pass = 10% off the combined price
const DEFAULT_TICKETS = { adult: 0, child: 0, family: 0, picnic: 0, famAdults: 2, famChildren: 2 };

const childPrice = (unit) => Math.round(unit * CHILD_RATE);
const familyPrice = (unit, v) =>
  Math.round((v.famAdults * unit + v.famChildren * childPrice(unit)) * FAMILY_RATE);
const PICNIC_PRICE = 150;
const ticketTotal = (unit, v) =>
  v.adult * unit + v.child * childPrice(unit) + v.family * familyPrice(unit, v) + (v.picnic || 0) * PICNIC_PRICE;
const ticketCount = (v) => v.adult + v.child + v.family;
const ticketKey = (v) => [v.adult, v.child, v.family, v.picnic || 0, v.famAdults, v.famChildren].join("-");
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const ticketSummary = (v) => {
  const parts = [];
  if (v.adult) parts.push(plural(v.adult, "adult", "adults"));
  if (v.child) parts.push(plural(v.child, "child", "children"));
  if (v.family)
    parts.push(
      `${plural(v.family, "family pass", "family passes")} (${plural(v.famAdults, "adult", "adults")} + ${plural(
        v.famChildren,
        "child",
        "children"
      )})`
    );
  if (v.picnic) parts.push(plural(v.picnic, "picnic option", "picnic options"));
  return parts.join(", ");
};

function Counter({ value, onChange, min = 0, max = 50, label }) {
  return (
    <span className="stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label}`}>
        −
      </button>
      <b>{value}</b>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label}`}>
        +
      </button>
    </span>
  );
}

function TicketTypes({ unit, value, onChange, showPicnic = false, picnicPrice = PICNIC_PRICE }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="tt">
      <section className={"tt-sec" + (value.adult > 0 ? " on" : "")}>
        <div className="tt-row">
          <div>
            <div className="ticket-title">Adult</div>
            <div className="muted">{inr(unit)} each</div>
          </div>
          <Counter value={value.adult} onChange={(n) => set({ adult: n })} label="adult tickets" />
        </div>
      </section>

      <section className={"tt-sec" + (value.child > 0 ? " on" : "")}>
        <div className="tt-row">
          <div>
            <div className="ticket-title">Child</div>
            <div className="muted">{inr(childPrice(unit))} each</div>
          </div>
          <Counter value={value.child} onChange={(n) => set({ child: n })} label="child tickets" />
        </div>
      </section>

      <section className={"tt-sec" + (value.family > 0 ? " on" : "")}>
        <div className="tt-row">
          <div>
            <div className="ticket-title">Family</div>
            <div className="muted">{inr(familyPrice(unit, value))} a pass · 10% off</div>
          </div>
          <Counter value={value.family} onChange={(n) => set({ family: n })} label="family passes" />
        </div>
        <div className="family-opts">
          <label>
            Adults in family
            <select value={value.famAdults} onChange={(e) => set({ famAdults: Number(e.target.value) })}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Children in family
            <select value={value.famChildren} onChange={(e) => set({ famChildren: Number(e.target.value) })}>
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {showPicnic && (
        <section className={"tt-sec" + ((value.picnic || 0) > 0 ? " on" : "")}>
          <div className="tt-row">
            <div>
              <div className="ticket-title">Picnic</div>
              <div className="muted">{inr(picnicPrice)} each</div>
            </div>
            <Counter
              value={value.picnic || 0}
              onChange={(n) => set({ picnic: n })}
              label="picnic options"
            />
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------- Slot picker popup (sports venues) ---------- */
function SlotModal({ venue, dates, selected, onSelect, onClose }) {
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState("");
  const mine = selected && selected.refKey === `venue-${venue.id}`;
  const [dayIdx, setDayIdx] = useState(mine ? selected.dayIdx : 0);
  const date = dates[dayIdx];
  const key = dateKey(date);
  const sport = SPORTS[venue.sport];
  const isPastSlot = (slotDateStr, hour) => {
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (slotDateStr < todayStr) return true;
    if (slotDateStr === todayStr) {
      const kolkataHours = parseInt(now.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false, hour: "2-digit" }), 10);
      return kolkataHours >= hour;
    }
    return false;
  };

  useEffect(() => {
    let alive = true;
    const fetchSlots = () => {
      api(`/venues/${venue.id}/slots?date=${key}`).then(data => { if (alive) setSlots(data); })
        .catch(e => { if (alive) setSlotError(e.message); });
    };

    setLoadingSlots(true); setSlotError("");
    api(`/venues/${venue.id}/slots?date=${key}`).then(data => { if (alive) setSlots(data); })
      .catch(e => { if (alive) setSlotError(e.message); })
      .finally(() => { if (alive) setLoadingSlots(false); });

    const interval = setInterval(fetchSlots, 30000);
    const onFocus = () => fetchSlots();
    window.addEventListener("focus", onFocus);

    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [venue.id, key]);
  const hours = [];
  for (let h = FIRST_HOUR; h < LAST_HOUR; h++) hours.push(h);

  return (
    <Popup
      color={sport.color}
      eyebrow={`${sport.icon} ${venue.sport}`}
      title={venue.name}
      sub={`${venue.city}, ${venue.sub || venue.subArea || ""} · from ${inr(venue.price)} an hour`}
      label={`Pick a slot at ${venue.name}`}
      onClose={onClose}
    >
      <DateTabs dates={dates} dayIdx={dayIdx} setDayIdx={setDayIdx} />

      <div className="slots">
        {loadingSlots && <p className="note">Loading live availability…</p>}
        {slotError && <p className="err">{slotError}</p>}
        {!loadingSlots && (slots.length > 0 ? slots : hours.map(h => ({
          startHour: h,
          price: slotPrice(venue, date, h),
          booked: false,
          past: isPastSlot(key, h),
          available: !isPastSlot(key, h),
        }))).map((slot) => {
          const h = slot.startHour;
          const isPast = Boolean(slot.past) || isPastSlot(key, h);
          const isBooked = Boolean(slot.booked) && !isPast;
          const unavailable = isPast || isBooked;
          const on = mine && selected.dayIdx === dayIdx && selected.hour === h && !unavailable;
          const price = Number(slot.price);
          return (
            <button
              key={h}
              disabled={unavailable}
              className={"slot" + (on ? " on" : "") + (unavailable ? " booked" : "") + (isPast ? " past" : "")}
              onClick={() => {
                if (unavailable) return;
                onSelect({
                  key: `venue-${venue.id}-${dayIdx}-${h}`,
                  refKey: `venue-${venue.id}`,
                  dayIdx,
                  hour: h,
                  price,
                  itemType: "SLOT",
                  refId: venue.id,
                  visitDate: key,
                  startHour: h,
                  tickets: { adult: 1, child: 0, family: 0, famAdults: 1, famChildren: 0, picnic: 0 },
                  title: venue.name,
                  detail: `${dayText(date)}, ${hourSp(h)}–${hourSp(h + 1)}`,
                });
              }}
              aria-pressed={on}
            >
              <span className="slot-time">{rangeLabel(h)}</span>
              <span className="slot-price">{isPast ? "Not Available" : isBooked ? "Booked" : inr(price)}</span>
            </button>
          );
        })}
      </div>

      <p className="note">Evening and weekend slots cost more.</p>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" disabled={!mine} onClick={onClose}>
          Done
        </button>
      </div>
    </Popup>
  );
}

/* ---------- Ticket popup (parks) ---------- */
function TicketModal({ park, dates, selected, onSelect, onClose }) {
  const mine = selected && selected.refKey === `park-${park.id}`;
  const [dayIdx, setDayIdx] = useState(mine ? selected.dayIdx : 0);
  const [tickets, setTickets] = useState(mine ? { ...DEFAULT_TICKETS, ...selected.tickets } : DEFAULT_TICKETS);
  const date = dates[dayIdx];
  const cat = PARK_CATS[park.cat];
  const each = isWeekend(date) ? Math.round(park.price * PREMIUM) : park.price;
  const total = ticketTotal(each, tickets);

  return (
    <Popup
      color={cat.color}
      eyebrow={`${cat.icon} ${park.cat}`}
      title={park.name}
      sub={`${park.area} · from ${inr(park.price)} a person`}
      label={`Pick tickets for ${park.name}`}
      onClose={onClose}
    >
      <DateTabs dates={dates} dayIdx={dayIdx} setDayIdx={setDayIdx} />

      <TicketTypes unit={each} value={tickets} onChange={setTickets} showPicnic picnicPrice={PICNIC_PRICE} />

      <p className="note">Weekend tickets cost more.</p>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn primary"
          disabled={ticketCount(tickets) === 0}
          onClick={() => {
            onSelect({
              key: `park-${park.id}-${dayIdx}-${ticketKey(tickets)}`,
              refKey: `park-${park.id}`,
              dayIdx,
              tickets,
              price: total,
              itemType: "PARK",
              refId: park.id,
              visitDate: dateKey(date),
              startHour: null,
              title: park.name,
              detail: `${dayText(date)}, ${ticketSummary(tickets)}`,
            });
            onClose();
          }}
        >
          Add to booking · {inr(total)}
        </button>
      </div>
    </Popup>
  );
}

/* ---------- Ticket popup (stadiums) ---------- */
function StadiumModal({ stadium, dates, initialStandId, selected, onSelect, onClose }) {
  const mine = selected && selected.refKey === `stadium-${stadium.id}`;
  const [eventIdx, setEventIdx] = useState(mine ? selected.eventIdx : 0);

  const initialStandIdx = useMemo(() => {
    if (initialStandId != null && stadium.stands && stadium.stands.length > 0) {
      const idx = stadium.stands.findIndex((s) => s.id === initialStandId);
      if (idx !== -1) return idx;
    }
    return mine ? selected.standIdx : 0;
  }, [initialStandId, stadium.stands, mine, selected]);

  const [standIdx, setStandIdx] = useState(initialStandIdx);
  const [tickets, setTickets] = useState(mine ? { ...DEFAULT_TICKETS, ...selected.tickets } : DEFAULT_TICKETS);
  const sport = SPORTS[stadium.sport] || { color: "#2563eb", icon: "🏏" };
  const events = stadium.events && stadium.events.length > 0 ? stadium.events : [{ id: 1, title: "Match Day", day: 0, time: 19 }];
  const ev = events[eventIdx] || events[0];
  const stand = (stadium.stands || STANDS)[standIdx] || (stadium.stands || STANDS)[0];
  const mult = stand ? (stand.mult || stand.priceMultiplier || 1.0) : 1.0;
  const each = Math.round(stadium.price * mult);
  const total = ticketTotal(each, tickets);
  const evDate = dates && ev.day != null ? dates[ev.day] : dates[0];

  return (
    <Popup
      color={sport.color}
      eyebrow={`${sport.icon} ${stadium.sport}`}
      title={stadium.name}
      sub={`${stadium.area}, ${stadium.city} · tickets from ${inr(stadium.price)}`}
      label={`Pick tickets for ${stadium.name}`}
      onClose={onClose}
    >
      <div className="pick-label">Choose an event</div>
      <div className="pick-list">
        {events.map((e, i) => (
          <button key={i} className={"pick" + (i === eventIdx ? " on" : "")} onClick={() => setEventIdx(i)} aria-pressed={i === eventIdx}>
            <span className="pick-main">
              <b>{e.title}</b>
              <span>
                {dates[e.day] ? dayText(dates[e.day]) : "Scheduled date"}, {hourSp(e.time)}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="pick-label">Choose a stand</div>
      <div className="pick-list">
        {(stadium.stands || STANDS).map((st, i) => {
          const stMult = st.mult || st.priceMultiplier || 1.0;
          return (
            <button key={st.name || i} className={"pick" + (i === standIdx ? " on" : "")} onClick={() => setStandIdx(i)} aria-pressed={i === standIdx}>
              <span className="pick-main">
                <b>{st.name}</b>
              </span>
              <span>{inr(stadium.price * stMult)} an adult ticket</span>
            </button>
          );
        })}
      </div>

      <TicketTypes unit={each} value={tickets} onChange={setTickets} />

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn primary"
          disabled={ticketCount(tickets) === 0}
          onClick={() => {
            onSelect({
              key: `stadium-${stadium.id}-${eventIdx}-${standIdx}-${ticketKey(tickets)}`,
              refKey: `stadium-${stadium.id}`,
              eventIdx,
              standIdx,
              tickets,
              price: total,
              itemType: "STADIUM",
              refId: stadium.id,
              eventId: ev.id,
              standId: stand.id,
              visitDate: evDate ? dateKey(evDate) : null,
              startHour: ev.time,
              title: stadium.name,
              detail: `${ev.title}, ${evDate ? dayText(evDate) : ""}, ${hourSp(ev.time)} · ${stand.name} · ${ticketSummary(tickets)}`,
            });
            onClose();
          }}
        >
          Add to booking · {inr(total)}
        </button>
      </div>
    </Popup>
  );
}

/* ---------- Booking panel ---------- */
function BookingPanel({ selected, onRemove, onNotify, onDone }) {
  const [coupon, setCoupon] = useState("");
  const [split, setSplit] = useState(1);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [hold, setHold] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showTicketPass, setShowTicketPass] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  const handleDone = () => {
    setShowTicketPass(false);
    setShowPayment(false);
    setHold(null);
    setPaymentResult(null);
    if (onDone) {
      onDone();
    } else {
      onRemove();
    }
  };

  useEffect(() => {
    setCoupon(""); setSplit(1); setQuote(null); setError(""); setHold(null);
  }, [selected?.key]);

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    const payload = {
      itemType: selected.itemType, refId: selected.refId, eventId: selected.eventId || null, standId: selected.standId || null,
      visitDate: selected.visitDate || null, startHour: selected.startHour ?? null, tickets: selected.tickets || {adult:1,child:0,family:0,famAdults:1,famChildren:0,picnic:0},
      coupon: coupon.trim() || null, splitCount: split
    };
    api('/quotes', { method:'POST', body:JSON.stringify(payload) })
      .then(q => { if (alive) { setQuote(q); setError(""); } })
      .catch(e => { if (alive) { setQuote(null); setError(e.message); } });
    return () => { alive=false; };
  }, [selected, coupon, split]);

  useEffect(() => {
    if (!hold?.holdExpiresAt) return;
    const tick = () => {
      const seconds = Math.max(0, Math.floor((new Date(hold.holdExpiresAt + "Z").getTime() - Date.now()) / 1000));
      if (seconds === 0) setHold(null);
      else setHold(h => h ? ({...h, seconds}) : h);
    };
    tick(); const id=setInterval(tick,1000); return () => clearInterval(id);
  }, [hold?.holdExpiresAt]);

  if (!selected) return null;
  const mm = Math.floor((hold?.seconds || 0)/60);
  const ss = String((hold?.seconds || 0)%60).padStart(2,'0');

  const holdBooking = async (openPayment = true) => {
    if (!quote) return;
    setBusy(true); setError("");
    try {
      const tickets = selected.tickets || { adult: 1, child: 0, family: 0, famAdults: 1, famChildren: 0, picnic: 0 };
      const payload = { itemType:selected.itemType, refId:selected.refId, eventId:selected.eventId||null, standId:selected.standId||null, visitDate:selected.visitDate||null, startHour:selected.startHour??null, tickets, coupon:coupon.trim()||null, splitCount:split };
      const result = await api('/bookings/hold', {method:'POST', body:JSON.stringify(payload)});
      setHold({...result, seconds:600});
      if (onNotify) {
        onNotify({
          type: "hold",
          title: "⏳ Slot Held for 10 Minutes",
          message: `Your reservation at ${selected.title} is held. Complete checkout before timer ends.`,
          severity: "info",
        });
      }
      if (openPayment) setShowPayment(true);
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  };
  const confirmBooking = async () => {
    if (!hold?.bookingId) return;
    setBusy(true); setError("");
    try { const result = await api(`/bookings/${hold.bookingId}/confirm`, {method:'POST'}); setHold({...hold, ...result, seconds:0, confirmed:true}); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  };
  const cancelHold = async () => {
    if (!hold?.bookingId) { onRemove(); return; }
    // If the booking is already confirmed, DO NOT cancel or delete! Simply close the modal and redirect to landing!
    if (hold?.confirmed) {
      handleDone();
      return;
    }
    try { await api(`/bookings/${hold.bookingId}`, {method:'DELETE'}); } catch {}
    setHold(null); onRemove();
  };

  return (
    <div className="booking-overlay" role="dialog" aria-modal="true" aria-label="Your booking">
      <aside className="panel booking-popup">
        <div className="panel-head"><span>Your booking</span><button className="booking-close" type="button" onClick={hold?.confirmed ? handleDone : cancelHold} aria-label="Close booking">×</button></div>
        <div className="panel-body">
          <div className="line item"><span>{selected.title}</span><b>{inr(quote?.subtotal ?? selected.price)}</b></div>
          <div className="muted">{selected.detail}</div>
          {!hold?.confirmed && <button className="link" onClick={cancelHold}>Remove</button>}
        </div>
        <div className="divider" aria-hidden="true" />
        <div className="panel-body">
          <div className="coupon"><input value={coupon} onChange={e=>setCoupon(e.target.value)} placeholder="Coupon, try SPORT10" aria-label="Coupon code"/><button onClick={()=>setCoupon(coupon.trim().toUpperCase())}>Apply</button></div>
          {error && <div className="err">{error}</div>}
          {quote?.couponMessage && <div className="ok">{quote.couponMessage}</div>}
          <div className="line"><span>Subtotal</span><span>{inr(quote?.subtotal ?? selected.price)}</span></div>
          {!!quote?.discount && <div className="line"><span>Discount</span><span>−{inr(quote.discount)}</span></div>}
          <div className="line"><span>Convenience fee</span><span>{inr(quote?.fee || 0)}</span></div>
          <div className="line total"><span>Total</span><span>{inr(quote?.total ?? selected.price)}</span></div>
          <div className="line split"><span>Split with friends</span><span className="stepper"><button onClick={()=>setSplit(s=>Math.max(1,s-1))} disabled={split===1}>−</button><b>{split}</b><button onClick={()=>setSplit(s=>Math.min(50,s+1))}>+</button></span></div>
          {split>1 && <div className="muted">{inr(quote?.perPerson || 0)} each</div>}
          {!hold?.confirmed && (
            <button
              className="btn primary wide"
              onClick={() => holdBooking(true)}
              disabled={busy || !quote || !!hold?.bookingId}
            >
              {hold?.bookingId ? `Held for ${mm}:${ss}` : busy ? 'Creating hold…' : '💳 Proceed to Payment'}
            </button>
          )}
          {hold?.bookingId && !hold?.confirmed && (
            <button
              className="btn wide"
              style={{ marginTop: 8, background: '#16a34a', color: '#fff', fontWeight: 700 }}
              onClick={() => setShowPayment(true)}
              disabled={busy || hold.seconds <= 0}
            >
              ⚡ Pay Now (UPI / Card / QR Scanner)
            </button>
          )}
          {hold?.confirmed && (
            <div className="ok" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              <span>Booking #{hold.bookingId} confirmed successfully.</span>
              <button
                type="button"
                className="btn primary"
                style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={() => setShowTicketPass(true)}
              >
                🎟️ View Entry Pass & Receipt
              </button>
            </div>
          )}
        </div>
      </aside>

      {showPayment && hold && (
        <PaymentGateway
          booking={hold}
          quote={quote}
          selected={selected}
          secondsLeft={hold?.seconds || 600}
          onSuccess={(data) => {
            const confirmedBooking = data?.booking || {};
            setPaymentResult(data);
            setHold(h => ({
              ...h,
              ...confirmedBooking,
              bookingId: confirmedBooking.bookingId || h?.bookingId || h?.id,
              confirmed: true,
              seconds: 0,
            }));
          }}
          onClose={() => {
            setShowPayment(false);
            if (hold?.confirmed || paymentResult?.success) {
              handleDone();
            }
          }}
          onViewTicket={() => {
            setShowPayment(false);
            setShowTicketPass(true);
          }}
          onNotify={onNotify}
        />
      )}

      {showTicketPass && (hold?.confirmed || paymentResult?.success) && (
        <TicketPassModal
          booking={hold}
          selected={selected}
          paymentResult={paymentResult}
          onClose={handleDone}
        />
      )}
    </div>
  );
}

/* ---------- Cards ---------- */
function VenueCard({ v, active, onOpen, onTravel }) {
  const s = SPORTS[v.sport];
  return (
    <article className={"card" + (active ? " active" : "")}>
      <button className="card-select" onClick={onOpen} aria-haspopup="dialog" aria-label={`Book a slot at ${v.name}`}>
        <div className="card-head" style={{ background: s.color }}>
          <span className="card-icon">{s.icon}</span> {v.sport}
        </div>
        <div className="card-body">
          <div className="card-name">{v.name}</div>
          <div className="muted">
            {v.city}, {v.sub || v.subArea || ""}
          </div>
          <div className="tags">
            {v.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="card-foot">
            <span>
              From <b>{inr(v.price)}</b> an hour
            </span>
            <span>★ {v.rating}</span>
          </div>
        </div>
      </button>
      <div className="card-actions">
        <button type="button" className="travel-card-button" onClick={onTravel} aria-haspopup="dialog">
          🧭 Travel &amp; Weather
        </button>
      </div>
    </article>
  );
}

function ParkCard({ p, active, onOpen, onTravel }) {
  const c = PARK_CATS[p.cat];
  return (
    <article className={"card" + (active ? " active" : "")}>
      <button className="card-select" onClick={onOpen} aria-haspopup="dialog" aria-label={`View tickets for ${p.name}`}>
        <div className="card-head" style={{ background: c.color }}>
          <span className="card-icon">{c.icon}</span> {p.cat}
        </div>
        <div className="card-body">
          <div className="card-name">{p.name}</div>
          <div className="muted">{p.area}</div>
          <div className="tags">
            {p.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="card-foot">
            <span>
              From <b>{inr(p.price)}</b>
            </span>
          </div>
        </div>
      </button>
      <div className="card-actions">
        <button type="button" className="travel-card-button" onClick={onTravel} aria-haspopup="dialog">
          🧭 Travel &amp; Weather
        </button>
      </div>
    </article>
  );
}

function StadiumCard({ st, nextText, active, onOpen, onTravel, onOpenDetails }) {
  const details = getStadiumDetails(st);
  const stands = st.stands && st.stands.length > 0 ? st.stands : [
    { name: "North Stand", mult: 1.0 },
    { name: "South Stand", mult: 1.2 },
    { name: "East Stand", mult: 1.0 },
    { name: "West Stand", mult: 1.5 },
    { name: "VIP / Premium Stand", mult: 3.0 },
  ];

  return (
    <article className={"card stadium-card-enhanced" + (active ? " active" : "")}>
      <div className="stadium-card-image-wrap" onClick={onOpenDetails} title="Click to view full stadium details">
        <img src={details.image} alt={st.name} className="stadium-card-img" loading="lazy" />
        <div className="stadium-card-overlay-gradient"></div>
        <div className="stadium-card-badges-top">
          <span className="card-badge capacity-badge">🏟️ {details.capacity.toLocaleString()}</span>
          <span className="card-badge rating-badge">★ {details.rating}</span>
        </div>
        <div className="stadium-card-city-tag">📍 {st.city}</div>
      </div>

      <div className="card-body">
        <div className="card-name" onClick={onOpenDetails} title="Click to view full stadium details" style={{ cursor: "pointer" }}>
          {st.name}
        </div>
        <div className="muted">
          {st.area}, {st.city}
        </div>

        <div className="stands-tag-row">
          <span className="stands-label">Stands:</span>
          {stands.slice(0, 4).map((s, idx) => (
            <span key={idx} className="stand-tag-pill">{s.name.replace(" Stand", "")}</span>
          ))}
          {stands.length > 4 && <span className="stand-tag-pill more">+{stands.length - 4} more</span>}
        </div>

        <div className="next">
          <span className="cricket-ball-icon">🏏</span> <b>Match:</b> {nextText}
        </div>

        <div className="card-foot">
          <span>
            Tickets from <b>{inr(st.price)}</b>
          </span>
        </div>

        <div className="stadium-card-btn-grid">
          
          <button
            type="button"
            className="btn-stadium-action btn-book-card"
            onClick={onOpen}
            aria-label={`Book tickets for ${st.name}`}
          >
            Book Tickets →
          </button>
        </div>

        <div className="card-actions-sub">
          <button type="button" className="travel-card-button" onClick={onTravel} aria-haspopup="dialog">
            🧭 Travel &amp; Weather
          </button>
          <button type="button" className="details-link-button" onClick={onOpenDetails}>
            Arena Info ℹ️
          </button>
        </div>
      </div>
    </article>
  );
}

/* ---------- App ---------- */
export default function App() {
  const dates = useMemo(buildDates, []);
  const [tab, setTab] = useState("Play");
  const [city, setCity] = useState("All");
  const [sport, setSport] = useState("All");
  const [parkCat, setParkCat] = useState("All");
  const [stadiumSport, setStadiumSport] = useState("All");
  const [open, setOpen] = useState(null); // { kind: "venue" | "park", id }
  const [selected, setSelected] = useState(null);
  const [travel, setTravel] = useState(null);
  const [citiesData, setCitiesData] = useState([]);
  const [sportsData, setSportsData] = useState([]);
  const [parkCatsData, setParkCatsData] = useState([]);
  const [venuesData, setVenuesData] = useState([]);
  const [parksData, setParksData] = useState([]);
  const [stadiumsData, setStadiumsData] = useState([]);
  const [stadiumDetails, setStadiumDetails] = useState({});
  const [dataError, setDataError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [selectedBookingForTicket, setSelectedBookingForTicket] = useState(null);
  const travelTriggerRef = useRef(null);

  useEffect(() => {
    api('/events/updates')
      .then((items) => {
        if (Array.isArray(items)) {
          setNotifications(
            items.map((item) => ({
              id: item.id || Math.random(),
              type: item.type || "event",
              title: item.title,
              message: item.message,
              timestamp: item.timestamp || "Just now",
              severity: item.severity || "info",
              read: false,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const addNotification = (notif) => {
    const id = Date.now() + Math.random();
    const newNotif = { id, timestamp: "Just now", read: false, ...notif };
    setNotifications((prev) => [newNotif, ...prev]);

    const toastId = id;
    setToasts((prev) => [
      ...prev,
      {
        id: toastId,
        type:
          notif.type === "payment_failed"
            ? "error"
            : notif.type === "payment_success"
            ? "success"
            : notif.type === "event"
            ? "event"
            : "info",
        title: notif.title,
        message: notif.message,
      },
    ]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 5000);
  };

  useEffect(() => {
    Promise.all([api('/cities'), api('/sports'), api('/park-categories'), api('/venues'), api('/parks'), api('/stadiums')])
      .then(([cities,sports,cats,venues,parks,stadiums]) => {
        setCitiesData(cities);
        setSportsData(sports);
        setParkCatsData(cats);
        setVenuesData(venues);
        setParksData(parks);
        setStadiumsData(stadiums);
      }).catch(e => setDataError(e.message));
  }, []);

  const dynamicSports = useMemo(() => Object.fromEntries((sportsData.length?sportsData:Object.entries(SPORTS).map(([name,v],i)=>({id:i+1,name,...v}))).map(s=>[s.name,{color:s.color||'#4a2fe0',icon:s.icon||'🏅'}])), [sportsData]);
  const dynamicCats = useMemo(() => Object.fromEntries((parkCatsData.length?parkCatsData:Object.entries(PARK_CATS).map(([name,v],i)=>({id:i+1,name,...v}))).map(c=>[c.name,{color:c.color||'#4a2fe0',icon:c.icon||'🌳'}])), [parkCatsData]);
  useEffect(() => { Object.assign(SPORTS, dynamicSports); Object.assign(PARK_CATS, dynamicCats); }, [dynamicSports, dynamicCats]);
  const CITIES_LIVE = ['All', ...citiesData.map(c=>c.name)];
  const sportId = sportsData.find(s=>s.name===sport)?.id;
  const cityId = citiesData.find(c=>c.name===city)?.id;
  const catId = parkCatsData.find(c=>c.name===parkCat)?.id;
  const stadiumSportId = sportsData.find(s=>s.name===stadiumSport)?.id;
  const venues = venuesData.filter(v => (city === 'All' || v.city === city) && (sport === 'All' || v.sport === sport));
  const parks = parksData.filter(p => (city === 'All' || p.city === city) && (parkCat === 'All' || p.cat === parkCat));
  const stadiums = stadiumsData.filter(st => (city === 'All' || st.city === city) && (stadiumSport === 'All' || st.sport === stadiumSport));

  // Stadium Tickets Feature States
  const [stadiumCity, setStadiumCity] = useState("Hyderabad");
  const [stadiumDetailsModal, setStadiumDetailsModal] = useState(null);
  const [initialStandForModal, setInitialStandForModal] = useState(null);

  const majorStadiumIds = useMemo(() => [201, 210, 207, 224, 225, 240, 241, 242, 243, 244], []);

  // Filter stadiums strictly by city for the 5 international cricket cities
  const stadiumTicketsByCity = useMemo(() => {
    const map = {};
    const source = stadiumsData.length > 0 ? stadiumsData : STADIUMS;
    STADIUM_CITIES.forEach((c) => {
      map[c] = source.filter((st) => {
        const matchesCity = st.city && st.city.toLowerCase() === c.toLowerCase();
        const isMajor = majorStadiumIds.includes(st.id) || st.sport === "Cricket";
        return matchesCity && isMajor;
      });
    });
    return map;
  }, [stadiumsData, majorStadiumIds]);

  const stadiumTicketsList = stadiumTicketsByCity[stadiumCity] || [];

  useEffect(() => {
    if (tab !== "Stadium tickets") return;
    api(`/stadiums?city=${encodeURIComponent(stadiumCity)}`)
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setStadiumsData((prev) => {
            const existingIds = new Set(res.map((s) => s.id));
            const filtered = prev.filter((p) => !existingIds.has(p.id));
            return [...filtered, ...res];
          });
        }
      })
      .catch(() => {});
  }, [stadiumCity, tab]);

  const handleOpenStadiumModal = async (st) => {
    setInitialStandForModal(null);
    let details = stadiumDetails[st.id];
    if (!details || !details.events || !details.stands) {
      try {
        const d = await api(`/stadiums/${st.id}`);
        details = { ...d.stadium, events: d.events.map((e) => normalizeEvent(e, dates)), stands: d.stands };
        setStadiumDetails((x) => ({ ...x, [st.id]: details }));
      } catch {
        details = st;
      }
    }
    setOpen({ kind: "stadium", id: st.id });
  };

  const handleOpenStadiumDetails = async (st) => {
    let details = stadiumDetails[st.id];
    if (!details) {
      try {
        const d = await api(`/stadiums/${st.id}`);
        details = { ...d.stadium, events: d.events.map((e) => normalizeEvent(e, dates)), stands: d.stands };
        setStadiumDetails((x) => ({ ...x, [st.id]: details }));
      } catch {
        details = st;
      }
    }
    setStadiumDetailsModal(details || st);
  };
  const nextEvent = (st) => {
    if (st.events?.length) { const e=[...st.events].sort((a,b)=>a.day-b.day)[0]; return `${e.title}, ${dayText(dates[e.day])}, ${hourSp(e.time)}`; }
    if (st.nextEvent?.startsAt) { const d=buildDateFromIso(st.nextEvent.startsAt); return `${st.nextEvent.title}, ${d.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}, ${hourSp(new Date(st.nextEvent.startsAt).getHours())}`; }
    return 'Upcoming event';
  };

  const openVenue = open?.kind === "venue" && venues.find((v) => v.id === open.id);
  const openStadiumBase = open?.kind === "stadium" && (stadiumDetails[open.id] || stadiumsData.find((st) => st.id === open.id) || STADIUMS.find((st) => st.id === open.id));
  const openStadium = open?.kind === "stadium" ? (stadiumDetails[open.id] || (openStadiumBase?.events && openStadiumBase?.stands ? openStadiumBase : null) || openStadiumBase) : null;
  const openPark = open?.kind === "park" && parks.find((p) => p.id === open.id);
  useEffect(() => {
    if (open?.kind !== 'stadium' || stadiumDetails[open.id]) return;
    api(`/stadiums/${open.id}`).then(d => {
      const details = { ...d.stadium, events:d.events.map(e=>normalizeEvent(e,dates)), stands:d.stands };
      setStadiumDetails(x=>({...x,[open.id]:details}));
    }).catch(e=>setDataError(e.message));
  }, [open?.kind, open?.id, dates]);
  const close = () => setOpen(null);
  const openTravel = (event, details) => {
    travelTriggerRef.current = event.currentTarget;
    setTravel(details);
  };
  const closeTravel = () => {
    setTravel(null);
    requestAnimationFrame(() => travelTriggerRef.current?.focus());
  };

  const handleRedirectToLanding = () => {
    setSelected(null);
    setOpen(null);
    setStadiumDetailsModal(null);
    setTravel(null);
    setTab("Play");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const stadiumSports = [...new Set(stadiumsData.map((st) => st.sport))];
  const chipConfig = {
    "Play": { chips: Object.keys(SPORTS), value: sport, set: setSport, icon: (c) => SPORTS[c]?.icon },
    "Parks": { chips: Object.keys(PARK_CATS), value: parkCat, set: setParkCat, icon: (c) => PARK_CATS[c]?.icon },
    "Stadium tickets": { chips: stadiumSports, value: stadiumSport, set: setStadiumSport, icon: (c) => SPORTS[c]?.icon },
  }[tab] || { chips: [], value: "All", set: () => {}, icon: () => null };
  const chips = ["All", ...chipConfig.chips];
  const chipValue = chipConfig.value;
  const setChip = chipConfig.set;
  const chipIcon = chipConfig.icon;

  return (
    <div className="app">
      <style>{css}</style>

      <header className="hero">
        <div className="wrap">
          <div className="top">
            <div className="logo">SportsHub</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <nav>
                {TABS.map((t) => (
                  <button key={t} className={"pill" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>
                    {t === "My Bookings" ? "🎟️ My Bookings" : t}
                  </button>
                ))}
              </nav>
              <NotificationCenter
                notifications={notifications}
                onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                onClear={() => setNotifications([])}
                onAddNotification={addNotification}
              />
            </div>
          </div>
          <h1>{tab === "My Bookings" ? "Your SportsHub Bookings" : "Play it. Watch it. Join in."}</h1>
          {tab !== "Stadium tickets" && tab !== "My Bookings" ? (
            <div className="filters">
              <label className="city">
                City
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  {CITIES_LIVE.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              {chips.map((c) => (
                <button key={c} className={"chip" + (chipValue === c ? " on" : "")} onClick={() => setChip(c)}>
                  {c !== "All" && chipIcon(c)} {c}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <main className="wrap layout">
        {dataError && <div className="err wide-msg">Backend connection: {dataError}. Start the Spring Boot backend on port 8080.</div>}

        {/* Stadium Tickets — City Selection Bar */}
        {tab === "Stadium tickets" && (
          <div className="stadium-city-banner">
            <div className="stadium-city-intro">
              <h3>🏟️ Select Match City &amp; International Cricket Arena</h3>
              <p>
                Select your city to view its international cricket stadium, explore 360° 3D interactive stands, and book official match tickets.
              </p>
            </div>
            <div className="stadium-city-pills" role="tablist" aria-label="City selection for stadiums">
              {STADIUM_CITIES.map((c) => {
                const count = (stadiumTicketsByCity[c] || []).length;
                return (
                  <button
                    key={c}
                    role="tab"
                    aria-selected={stadiumCity === c}
                    className={`stadium-city-btn ${stadiumCity === c ? "active" : ""}`}
                    onClick={() => setStadiumCity(c)}
                  >
                    <span className="city-pin">📍</span>
                    <span className="city-text">{c}</span>
                    <span className="city-count-badge">
                      {count} {count === 1 ? "Stadium" : "Stadiums"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "My Bookings" ? (
          <MyBookings
            onOpenTicket={(b) => setSelectedBookingForTicket(b)}
            onExplore={() => setTab("Play")}
          />
        ) : (
          <section className="grid" aria-label={tab}>
            {tab === "Play" &&
              venues.map((v) => (
                <VenueCard
                  key={v.id}
                  v={v}
                  active={selected?.refKey === `venue-${v.id}`}
                  onOpen={() => setOpen({ kind: "venue", id: v.id })}
                  onTravel={(event) => {
                    const hasSelectedSlot = selected?.refKey === `venue-${v.id}`;
                    openTravel(event, {
                      place: { ...v, area: v.sub || v.subArea },
                      date: dates[hasSelectedSlot ? selected.dayIdx : 0],
                      hour: hasSelectedSlot ? selected.hour : 18,
                      visitLabel: hasSelectedSlot ? "Your selected booking" : "Suggested visit time · not booked",
                      fixedSchedule: false,
                    });
                  }}
                />
              ))}

            {tab === "Parks" &&
              parks.map((p) => (
                <ParkCard
                  key={p.id}
                  p={p}
                  active={selected?.refKey === `park-${p.id}`}
                  onOpen={() => setOpen({ kind: "park", id: p.id })}
                  onTravel={(event) => {
                    const hasSelectedTicket = selected?.refKey === `park-${p.id}`;
                    openTravel(event, {
                      place: { ...p, sub: p.area },
                      date: dates[hasSelectedTicket ? selected.dayIdx : 0],
                      hour: 10,
                      visitLabel: hasSelectedTicket ? "Your selected visit" : "Suggested visit time · not booked",
                      fixedSchedule: false,
                    });
                  }}
                />
              ))}

            {tab === "Play" && venues.length === 0 && (
              <p className="empty wide-msg">No venues match these filters. Try another city or sport.</p>
            )}
            {tab === "Parks" && parks.length === 0 && (
              <p className="empty wide-msg">No parks match these filters. Try another city or type.</p>
            )}

            {tab === "Stadium tickets" &&
              stadiumTicketsList.map((st) => {
                const fullDetails = stadiumDetails[st.id] || st;
                const hasSelectedEvent = selected?.refKey === `stadium-${st.id}`;
                const events = fullDetails.events || [];
                const event = hasSelectedEvent && events[selected.eventIdx]
                  ? events[selected.eventIdx]
                  : (events.length > 0 ? [...events].sort((a, b) => a.day - b.day)[0] : null);

                return (
                  <StadiumCard
                    key={st.id}
                    st={fullDetails}
                    nextText={nextEvent(fullDetails)}
                    active={selected?.refKey === `stadium-${st.id}`}
                    onOpen={() => handleOpenStadiumModal(st)}
                    onOpenDetails={() => handleOpenStadiumDetails(st)}
                    onTravel={(clickEvent) =>
                      openTravel(clickEvent, {
                        place: { ...st, area: st.area },
                        date: event && dates[event.day] ? dates[event.day] : dates[0],
                        hour: event ? event.time : 19,
                        visitLabel: event ? event.title : st.name,
                        fixedSchedule: true,
                      })
                    }
                  />
                );
              })}
            {tab === "Stadium tickets" && stadiumTicketsList.length === 0 && (
              <p className="empty wide-msg">No international stadiums found for {stadiumCity}.</p>
            )}
          </section>
        )}

        <BookingPanel
          selected={selected}
          onRemove={() => setSelected(null)}
          onNotify={addNotification}
          onDone={handleRedirectToLanding}
        />
      </main>

      <p className="demo">Demo data only. No money moves and the passes are not real QR codes.</p>

      {openVenue && (
        <SlotModal venue={openVenue} dates={dates} selected={selected} onSelect={setSelected} onClose={close} />
      )}
      {openPark && (
        <TicketModal park={openPark} dates={dates} selected={selected} onSelect={setSelected} onClose={close} />
      )}
      {open?.kind === "stadium" && !openStadium && (
        <Popup color="#4a2fe0" eyebrow="🏟️ Stadium" title={openStadiumBase?.name || "Loading stadium"} sub="Loading live events and stands…" label="Loading stadium details" onClose={close}><p className="note">Please wait…</p></Popup>
      )}
      {openStadium && (
        <StadiumModal
          stadium={openStadium}
          dates={dates}
          initialStandId={initialStandForModal}
          selected={selected}
          onSelect={(bookingSelection) => {
            setSelected(bookingSelection);
            setInitialStandForModal(null);
          }}
          onClose={() => {
            close();
            setInitialStandForModal(null);
          }}
        />
      )}
      {stadiumDetailsModal && (
        <StadiumDetailsModal
          stadium={stadiumDetailsModal}
          dates={dates}
          onClose={() => setStadiumDetailsModal(null)}
          onBookTickets={(st) => {
            setStadiumDetailsModal(null);
            handleOpenStadiumModal(st);
          }}
          onTravel={(e, st) => {
            const ev = st.events && st.events[0];
            openTravel(e, {
              place: { ...st, area: st.area },
              date: ev && dates[ev.day] ? dates[ev.day] : dates[0],
              hour: ev ? ev.time : 19,
              visitLabel: ev ? ev.title : st.name,
              fixedSchedule: true,
            });
          }}
        />
      )}
      {travel && (
        <TravelWeather
          {...travel}
          onClose={closeTravel}
        />
      )}
      {selectedBookingForTicket && (
        <TicketPassModal
          booking={selectedBookingForTicket}
          onClose={() => setSelectedBookingForTicket(null)}
        />
      )}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}

/* ---------- Styles ---------- */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box}
html,body,#root{margin:0;width:100%;min-height:100%}
body{margin:0}
.app{width:100%;--bg:#f4f1ff;--ink:#1c1537;--muted:#6b6585;--line:#ddd6f7;--brand:#4a2fe0;--deep:#2a1a8f;
  font-family:'Manrope',system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);min-height:100vh;color:var(--ink);padding-bottom:32px}
button{font:inherit;cursor:pointer}
button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #ffb703;outline-offset:2px}
.wrap{width:100%;max-width:none;margin:0;padding:0 clamp(16px,3vw,48px)}

.hero{background:var(--deep);padding:22px 0 26px;color:#fff}
.top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.logo{font-weight:800;font-size:22px;letter-spacing:-.01em}
nav{display:flex;gap:8px;flex-wrap:wrap}
.pill{border:1px solid rgba(255,255,255,.55);background:transparent;color:#fff;border-radius:999px;padding:9px 18px;font-size:14px;font-weight:500}
.pill:hover{background:rgba(255,255,255,.12)}
.pill.on{background:#fff;color:var(--deep);font-weight:700;border-color:#fff}
h1{font-size:clamp(30px,5.2vw,56px);margin:26px 0 18px;font-weight:800;letter-spacing:-.035em;line-height:1.05}
.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.city{display:flex;align-items:center;gap:10px;font-size:15px;color:#fff}
.city select{appearance:none;-webkit-appearance:none;-moz-appearance:none;background-color:rgba(255,255,255,.18);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 1.5l5 5 5-5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;color:#fff;border:1px solid rgba(255,255,255,.45);border-radius:999px;padding:9px 38px 9px 18px;font:inherit;font-size:15px;min-width:150px;cursor:pointer}
.city select:hover{background-color:rgba(255,255,255,.26)}
.city select option{color:var(--ink);background:#fff}
.chip{border:1px solid rgba(255,255,255,.55);background:transparent;color:#fff;border-radius:999px;padding:9px 18px;font-size:15px;font-weight:500}
.chip:hover{background:rgba(255,255,255,.12)}
.chip.on{background:#ffb703;border-color:#ffb703;color:var(--deep);font-weight:800}

.layout{margin-top:24px;display:block}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.wide-msg{grid-column:1/-1}
.card{text-align:left;padding:0;border:1px solid var(--line);border-radius:16px;background:#fff;overflow:hidden;color:inherit;transition:box-shadow .15s,transform .15s}
.card:hover{box-shadow:0 8px 22px rgba(42,26,143,.16);transform:translateY(-2px)}
.card.active{border:2px solid var(--brand)}
.card-select{display:block;width:100%;padding:0;border:0;border-radius:0;background:#fff;color:inherit;text-align:left}
.card-actions{padding:0 18px 16px}
.travel-card-button{width:100%;border:1px solid #dcd5f0;border-radius:10px;background:#f8f6ff;color:var(--deep);padding:10px 12px;font-size:13px;font-weight:800;text-align:center;transition:background .15s,border-color .15s}
.travel-card-button:hover{border-color:var(--brand);background:#eeeaff}
.card-head{color:#fff;font-weight:800;font-size:17px;padding:14px 18px;display:flex;align-items:center;gap:12px}
.card-icon{font-size:22px;line-height:1}
.card-body{padding:14px 18px 18px;display:flex;flex-direction:column;gap:6px}
.card-name{font-weight:800;font-size:18px;letter-spacing:-.01em}
.muted{font-size:14px;color:var(--muted)}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 2px}
.tags span{font-size:12px;border:1px solid var(--line);border-radius:6px;padding:2px 9px;color:var(--muted)}
.card-foot{display:flex;justify-content:space-between;font-size:15px;margin-top:4px}
.card-foot b{font-weight:800}

.panel{background:#fff;border:1px solid var(--line);border-radius:20px}
.booking-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(20,10,60,.55);backdrop-filter:blur(2px);animation:fade .15s ease-out}
.booking-popup{width:min(520px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;box-shadow:0 24px 70px rgba(0,0,0,.35);animation:pop .18s ease-out}
.booking-popup .panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.booking-close{width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;font-size:26px;line-height:1;display:flex;align-items:center;justify-content:center}
.booking-close:hover{background:rgba(255,255,255,.3)}
.panel-head{background:var(--brand);color:#fff;font-weight:800;font-size:20px;padding:18px 22px;border-radius:19px 19px 0 0}
.panel-body{padding:18px 22px;display:flex;flex-direction:column;gap:10px}
.divider{position:relative;border-top:2px dashed var(--line);margin:0 22px}
.divider::before,.divider::after{content:"";position:absolute;top:-11px;width:20px;height:20px;border-radius:50%;background:var(--bg);border:1px solid var(--line)}
.divider::before{left:-33px;clip-path:inset(0 0 0 50%)}
.divider::after{right:-33px;clip-path:inset(0 50% 0 0)}
.line{display:flex;justify-content:space-between;font-size:15px;color:var(--muted)}
.line.item{color:var(--ink);font-size:17px;gap:12px}
.line.item b{font-weight:800;white-space:nowrap}
.line.total{font-weight:800;font-size:22px;color:var(--ink);padding-top:4px}
.line.split{align-items:center;color:var(--ink)}
.link{align-self:flex-start;background:none;border:0;padding:0;color:var(--deep);text-decoration:underline;font-size:15px}
.coupon{display:flex;gap:8px}
.coupon input{flex:1;min-width:0;border:1px solid var(--line);background:#f6f4ff;border-radius:10px;padding:13px 14px;font:inherit;font-size:15px}
.coupon button{border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:10px;padding:0 20px;font-weight:600;font-size:15px}
.ok{color:#1f7a45;font-size:14px}.err{color:#b3261e;font-size:14px}
.stepper{display:flex;align-items:center;gap:14px}
.stepper b{min-width:14px;text-align:center}
.stepper button{width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:#fff;font-size:18px;line-height:1;color:var(--ink)}
.stepper button:disabled{opacity:.4;cursor:not-allowed}
.empty{font-size:15px;color:var(--muted);margin:0}

.btn{border-radius:12px;padding:13px 20px;font-weight:800;font-size:15px;border:1px solid transparent}
.btn.primary{background:var(--brand);color:#fff}
.btn.primary:disabled{background:#a99ef0;cursor:not-allowed}
.btn.ghost{background:#fff;color:var(--deep);border-color:var(--line)}
.btn.wide{width:100%;margin-top:6px;padding:16px}

.demo{text-align:center;font-size:12px;color:var(--muted);margin:24px 16px 0}

/* Popup */
.overlay{position:fixed;inset:0;background:rgba(20,10,60,.55);display:flex;align-items:center;justify-content:center;padding:16px;z-index:50;animation:fade .15s ease-out}
.modal{width:100%;max-width:580px;max-height:calc(100vh - 32px);overflow:auto;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.35);animation:pop .18s ease-out}
.modal-head{color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-radius:16px 16px 0 0}
.modal-head h2{margin:2px 0;font-size:21px;letter-spacing:-.01em}
.modal-sport{font-size:13px;font-weight:700;opacity:.92}
.modal-sub{font-size:13px;opacity:.92}
.close{background:rgba(255,255,255,.2);border:0;color:#fff;width:32px;height:32px;border-radius:50%;flex:none}
.close:hover{background:rgba(255,255,255,.35)}
.modal-body{padding:16px 20px 20px}
.dates{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;scrollbar-width:thin}
.date{flex:none;border:1px solid var(--line);background:#fff;border-radius:8px;padding:8px 12px;font-size:13px;color:var(--ink)}
.date.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(105px,1fr));gap:8px;margin-top:8px}
.slot{display:flex;flex-direction:column;align-items:flex-start;gap:2px;border:1px solid var(--line);background:#fff;border-radius:8px;padding:9px 11px;text-align:left;color:var(--ink)}
.slot:hover:not(:disabled){border-color:var(--brand)}
.slot-time{font-size:13px;font-weight:700}
.slot-price{font-size:12px;color:var(--muted)}
.slot.on{background:var(--brand);border-color:var(--brand);color:#fff}
.slot.on .slot-price{color:#e3deff}
.slot.booked,.slot.past{background:#ece9fb;border-color:#e0dbf7;cursor:not-allowed}
.slot.booked .slot-time,.slot.booked .slot-price,.slot.past .slot-time,.slot.past .slot-price{text-decoration:line-through;color:#9a94b8}
.slot.past .slot-price{font-size:11px}
.ticket-row{display:flex;justify-content:space-between;align-items:center;gap:16px;border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-top:10px}
.ticket-title{font-weight:800;font-size:16px}
.note{font-size:12px;color:var(--muted);margin:12px 0 0}
.modal-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}

.tt{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.tt-sec{border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.tt-sec.on{border:2px solid var(--brand);padding:11px 13px}
.tt-row{display:flex;justify-content:space-between;align-items:center;gap:12px}
.family-opts{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)}
.family-opts label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);flex:1;min-width:130px}
.family-opts select{border:1px solid var(--line);background:#f6f4ff;border-radius:8px;padding:9px 10px;font:inherit;font-size:14px;color:var(--ink)}
.pick-label{font-size:13px;font-weight:800;margin:16px 0 8px}
.pick-list{display:flex;flex-direction:column;gap:8px}
.pick{display:flex;justify-content:space-between;align-items:center;gap:12px;text-align:left;border:1px solid var(--line);background:#fff;border-radius:10px;padding:11px 14px;color:var(--ink)}
.pick:hover{border-color:var(--brand)}
.pick.on{border:2px solid var(--brand);padding:10px 13px;background:#f6f4ff}
.pick-main{display:flex;flex-direction:column;gap:2px}
.pick b{font-size:15px}
.pick span{font-size:13px;color:var(--muted)}
.next{font-size:13px;font-weight:600;margin-top:2px}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.overlay,.modal{animation:none}.card{transition:none}}
@media (max-width:600px){.booking-overlay{padding:12px}.booking-popup{width:100%;max-height:calc(100vh - 24px);border-radius:16px}.booking-popup .panel-head{border-radius:15px 15px 0 0}.booking-popup .panel-body{padding:16px}.booking-popup .divider{margin:0 16px}}
@media (max-width:560px){.grid{grid-template-columns:1fr}}
`;
