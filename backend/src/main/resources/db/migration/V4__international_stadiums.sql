-- Flyway migration V4: Add Chennai, Pune, Kolkata and major international cricket stadiums

-- 1. Cities
INSERT INTO city(id, name) VALUES(4, 'Chennai');
INSERT INTO city(id, name) VALUES(5, 'Pune');
INSERT INTO city(id, name) VALUES(6, 'Kolkata');

-- 2. Update and expand stand categories for 3D interactive viewer
UPDATE stand_category SET name='North Stand', price_multiplier=1.0 WHERE id=1;
UPDATE stand_category SET name='South Stand', price_multiplier=1.2 WHERE id=2;
UPDATE stand_category SET name='VIP / Premium Stand', price_multiplier=3.0 WHERE id=3;
INSERT INTO stand_category(id, name, price_multiplier) VALUES(4, 'East Stand', 1.0);
INSERT INTO stand_category(id, name, price_multiplier) VALUES(5, 'West Stand', 1.5);

-- 3. International Cricket Stadiums for Chennai, Pune, Kolkata
INSERT INTO stadium(id, sport_id, city_id, name, area, base_price) 
VALUES(240, 1, 4, 'MA Chidambaram Stadium (Chepauk)', 'Chepauk', 950);

INSERT INTO stadium(id, sport_id, city_id, name, area, base_price) 
VALUES(241, 1, 5, 'Maharashtra Cricket Association Stadium', 'Gahunje', 850);

INSERT INTO stadium(id, sport_id, city_id, name, area, base_price) 
VALUES(242, 1, 6, 'Eden Gardens', 'BBD Bagh', 1100);

-- 4. Stadium tags (13=Floodlights, 25=Parking, 14=Food stalls, 24=Metro nearby)
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(240, 13);
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(240, 25);
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(240, 14);
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(240, 24);

INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(241, 13);
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(241, 25);
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(241, 14);

INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(242, 13);
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(242, 25);
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(242, 14);
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(242, 24);

-- 5. Upcoming Matches / Events
INSERT INTO stadium_event(stadium_id, title, starts_at, capacity) 
VALUES(201, 'India vs Australia - 2nd T20I', DATEADD('DAY', 2, CURRENT_DATE) + INTERVAL '19' HOUR, 55000);

INSERT INTO stadium_event(stadium_id, title, starts_at, capacity) 
VALUES(207, 'India vs England - 1st ODI Super Series', DATEADD('DAY', 2, CURRENT_DATE) + INTERVAL '14' HOUR, 33108);

INSERT INTO stadium_event(stadium_id, title, starts_at, capacity) 
VALUES(240, 'Chennai Super Kings vs Mumbai Indians', DATEADD('DAY', 3, CURRENT_DATE) + INTERVAL '19' HOUR, 38200);

INSERT INTO stadium_event(stadium_id, title, starts_at, capacity) 
VALUES(240, 'India vs South Africa - 2nd ODI', DATEADD('DAY', 6, CURRENT_DATE) + INTERVAL '14' HOUR, 38200);

INSERT INTO stadium_event(stadium_id, title, starts_at, capacity) 
VALUES(241, 'India vs New Zealand - 3rd ODI', DATEADD('DAY', 4, CURRENT_DATE) + INTERVAL '14' HOUR, 37406);

INSERT INTO stadium_event(stadium_id, title, starts_at, capacity) 
VALUES(241, 'Maharashtra Premier League Grand Final', DATEADD('DAY', 7, CURRENT_DATE) + INTERVAL '19' HOUR, 37406);

INSERT INTO stadium_event(stadium_id, title, starts_at, capacity) 
VALUES(242, 'Kolkata Knight Riders vs Sunrisers Hyderabad', DATEADD('DAY', 3, CURRENT_DATE) + INTERVAL '19' HOUR, 68000);

INSERT INTO stadium_event(stadium_id, title, starts_at, capacity) 
VALUES(242, 'India vs Australia - World Series Super Clash', DATEADD('DAY', 6, CURRENT_DATE) + INTERVAL '14' HOUR, 68000);

