# SportsHub Full Stack

This package contains the SportsHub React frontend and Spring Boot backend together.

## Structure
- `frontend/` React + Vite UI.
- `backend/` Spring Boot 4 + Java 17 REST API and H2/Flyway database.

## Run backend in Eclipse
Import `backend/pom.xml` as an Existing Maven Project. Run `SportsHubApplication` as a Spring Boot App. Backend: http://localhost:8080
Swagger: http://localhost:8080/swagger-ui.html

## Run frontend
Open a terminal in `frontend`:

`npm install`

`npm run dev`

Open http://localhost:5173

The frontend calls `http://localhost:8080/api` by default. Copy `.env.example` to `.env` to change it.

## Integrated behavior
The UI loads cities, sports, park categories, venues, parks and stadiums from the backend. Venue slots are loaded live by date. Quotes, coupons, fees, split calculations, booking holds, hold expiry and confirmation are handled by the backend.

Payment gateway, authentication, notifications and production deployment are intentionally not included yet.
