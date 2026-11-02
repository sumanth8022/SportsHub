# SportsHub Backend — Java 17 / Spring Boot

Production-oriented REST backend for the SportsHub React application. The frontend is intentionally unchanged in this package.

## Stack
- Java 17
- Spring Boot 4.0.9
- Maven
- Spring Web / Validation / Data JPA / Actuator
- H2 + Flyway for local development
- MySQL 8.4-ready production configuration
- Springdoc OpenAPI / Swagger UI
- Scheduled expiry for temporary booking holds

## Run locally
1. Open this folder in IntelliJ IDEA / Eclipse / VS Code.
2. Make sure JDK 17 is selected.
3. Run with Maven: `mvn spring-boot:run`.
4. API base URL: `http://localhost:8080`
5. Swagger: `http://localhost:8080/swagger-ui.html`
6. H2 console: `http://localhost:8080/h2-console`

The H2 development database uses `./data/sportshub` and Flyway creates/validates the schema and seed data automatically.

## MySQL local deployment
Start MySQL with `docker compose up -d mysql`, then run the application with the production profile and the values from `.env.example`.

## API surface
- GET `/api/cities`
- GET `/api/sports`
- GET `/api/park-categories`
- GET `/api/venues?city=&sport=`
- GET `/api/venues/{id}/slots?date=`
- GET `/api/parks?city=&category=`
- GET `/api/stadiums?city=&sport=`
- GET `/api/stadiums/{id}`
- POST `/api/quotes`
- POST `/api/bookings/hold`
- DELETE `/api/bookings/{id}`
- POST `/api/bookings/{id}/confirm`

## Booking/pricing behavior
- Evening/weekend venue pricing multiplier: 1.30
- Weekend park pricing multiplier: 1.30
- Child price: 60% of adult
- Family price: 90% of adult/child composition
- Coupon `SPORT10`: 10% discount
- Convenience fee: 2%
- Whole-rupee HALF_UP rounding
- Temporary holds expire after 10 minutes
- Slot collisions return HTTP 409
- Expired holds cannot be confirmed

## Deployment note
This package is structured so the React frontend can be connected after the backend APIs are verified. No frontend code is modified here.
