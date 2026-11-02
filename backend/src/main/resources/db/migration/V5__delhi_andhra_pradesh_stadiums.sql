-- Flyway migration V5: Add Delhi and Andhra Pradesh (Visakhapatnam) with major international cricket stadiums

-- 1. Cities
INSERT INTO city(id, name) VALUES(7, 'Delhi');
INSERT INTO city(id, name) VALUES(8, 'Andhra Pradesh');

-- 2. International Cricket Stadiums
-- Delhi: Arun Jaitley Stadium (Feroz Shah Kotla)
INSERT INTO stadium(id, sport_id, city_id, name, area, base_price) 
VALUES(243, 1, 7, 'Arun Jaitley Stadium', 'Bahadur Shah Zafar Marg', 950);

-- Andhra Pradesh: Dr. Y.S. Rajasekhara Reddy ACA-VDCA Cricket Stadium (Visakhapatnam)
INSERT INTO stadium(id, sport_id, city_id, name, area, base_price) 
VALUES(244, 1, 8, 'Dr. Y.S. Rajasekhara Reddy ACA-VDCA Stadium', 'PM Palem, Visakhapatnam', 800);

-- 3. Stadium tags (13=Floodlights, 25=Parking, 14=Food stalls, 24=Metro nearby)
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(243, 13);
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(243, 25);
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(243, 14);
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(243, 24);

INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(244, 13);
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(244, 25);
INSERT INTO stadium_tag(stadium_id, tag_id) VALUES(244, 14);

-- 4. Upcoming Events / Matches
INSERT INTO stadium_event(stadium_id, title, starts_at, capacity) 
VALUES(243, 'Delhi Capitals vs Mumbai Indians - IPL T20 Thriller', DATEADD('DAY', 2, CURRENT_DATE) + INTERVAL '19' HOUR, 41000);

INSERT INTO stadium_event(stadium_id, title, starts_at, capacity) 
VALUES(243, 'India vs Australia - Border-Gavaskar Trophy Test', DATEADD('DAY', 5, CURRENT_DATE) + INTERVAL '9' HOUR, 41000);

INSERT INTO stadium_event(stadium_id, title, starts_at, capacity) 
VALUES(244, 'India vs South Africa - 1st T20I Clash', DATEADD('DAY', 3, CURRENT_DATE) + INTERVAL '19' HOUR, 27500);

INSERT INTO stadium_event(stadium_id, title, starts_at, capacity) 
VALUES(244, 'Delhi Capitals vs Sunrisers Hyderabad', DATEADD('DAY', 6, CURRENT_DATE) + INTERVAL '19' HOUR, 27500);

