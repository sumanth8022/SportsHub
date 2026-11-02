-- Flyway migration V7: Add location, address and coordinates support for venues, parks, and stadiums

-- 1. Alter venue table
ALTER TABLE venue ADD COLUMN IF NOT EXISTS address VARCHAR(300);
ALTER TABLE venue ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE venue ADD COLUMN IF NOT EXISTS latitude DOUBLE;
ALTER TABLE venue ADD COLUMN IF NOT EXISTS longitude DOUBLE;

-- 2. Alter park table
ALTER TABLE park ADD COLUMN IF NOT EXISTS address VARCHAR(300);
ALTER TABLE park ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE park ADD COLUMN IF NOT EXISTS latitude DOUBLE;
ALTER TABLE park ADD COLUMN IF NOT EXISTS longitude DOUBLE;

-- 3. Alter stadium table
ALTER TABLE stadium ADD COLUMN IF NOT EXISTS address VARCHAR(300);
ALTER TABLE stadium ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE stadium ADD COLUMN IF NOT EXISTS latitude DOUBLE;
ALTER TABLE stadium ADD COLUMN IF NOT EXISTS longitude DOUBLE;

-- 4. Specific major international cricket stadiums
UPDATE stadium SET address='Uppal Main Rd, Survey Colony, Uppal, Hyderabad, Telangana 500039', state='Telangana', latitude=17.4065, longitude=78.5593 WHERE id=201;
UPDATE stadium SET address='Vinoo Mankad Rd, Churchgate, Mumbai, Maharashtra 400020', state='Maharashtra', latitude=18.9389, longitude=72.8258 WHERE id=207;
UPDATE stadium SET address='Gymkhana Ground Rd, Sardar Patel Road, Secunderabad, Telangana 500003', state='Telangana', latitude=17.4435, longitude=78.4983 WHERE id=210;
UPDATE stadium SET address='Veer Nariman Rd, Churchgate, Mumbai, Maharashtra 400020', state='Maharashtra', latitude=18.9322, longitude=72.8242 WHERE id=224;
UPDATE stadium SET address='Sector 7, Nerul, Navi Mumbai, Maharashtra 400706', state='Maharashtra', latitude=19.0441, longitude=73.0298 WHERE id=225;
UPDATE stadium SET address='Victoria Hostel Rd, Chepauk, Chennai, Tamil Nadu 600005', state='Tamil Nadu', latitude=13.0628, longitude=80.2795 WHERE id=240;
UPDATE stadium SET address='Mumbai-Pune Expressway, Gahunje, Pune, Maharashtra 412101', state='Maharashtra', latitude=18.6745, longitude=73.7065 WHERE id=241;
UPDATE stadium SET address='BBD Bagh, Kolkata, West Bengal 700021', state='West Bengal', latitude=22.5646, longitude=88.3433 WHERE id=242;
UPDATE stadium SET address='Bahadur Shah Zafar Marg, New Delhi, Delhi 110002', state='Delhi', latitude=28.6379, longitude=77.2424 WHERE id=243;
UPDATE stadium SET address='PM Palem, Madhurawada, Visakhapatnam, Andhra Pradesh 530041', state='Andhra Pradesh', latitude=17.7997, longitude=83.3547 WHERE id=244;

-- 5. Default state, address, and coordinates by city for stadiums
UPDATE stadium SET state='Telangana', latitude=17.4401, longitude=78.3489, address=CONCAT(name, ', ', area, ', Hyderabad') WHERE city_id=1 AND address IS NULL;
UPDATE stadium SET state='Karnataka', latitude=12.9716, longitude=77.5946, address=CONCAT(name, ', ', area, ', Bengaluru') WHERE city_id=2 AND address IS NULL;
UPDATE stadium SET state='Maharashtra', latitude=19.0760, longitude=72.8777, address=CONCAT(name, ', ', area, ', Mumbai') WHERE city_id=3 AND address IS NULL;
UPDATE stadium SET state='Tamil Nadu', latitude=13.0827, longitude=80.2707, address=CONCAT(name, ', ', area, ', Chennai') WHERE city_id=4 AND address IS NULL;
UPDATE stadium SET state='Maharashtra', latitude=18.5204, longitude=73.8567, address=CONCAT(name, ', ', area, ', Pune') WHERE city_id=5 AND address IS NULL;
UPDATE stadium SET state='West Bengal', latitude=22.5726, longitude=88.3639, address=CONCAT(name, ', ', area, ', Kolkata') WHERE city_id=6 AND address IS NULL;
UPDATE stadium SET state='Delhi', latitude=28.6139, longitude=77.2090, address=CONCAT(name, ', ', area, ', Delhi') WHERE city_id=7 AND address IS NULL;
UPDATE stadium SET state='Andhra Pradesh', latitude=17.6868, longitude=83.2185, address=CONCAT(name, ', ', area, ', Visakhapatnam') WHERE city_id=8 AND address IS NULL;

-- 6. Venues locations by city
UPDATE venue SET state='Telangana', latitude=17.4401, longitude=78.3489, address=CONCAT(name, ', ', sub_area, ', Hyderabad') WHERE city_id=1;
UPDATE venue SET state='Karnataka', latitude=12.9716, longitude=77.5946, address=CONCAT(name, ', ', sub_area, ', Bengaluru') WHERE city_id=2;
UPDATE venue SET state='Maharashtra', latitude=19.0760, longitude=72.8777, address=CONCAT(name, ', ', sub_area, ', Mumbai') WHERE city_id=3;
UPDATE venue SET state='Tamil Nadu', latitude=13.0827, longitude=80.2707, address=CONCAT(name, ', ', sub_area, ', Chennai') WHERE city_id=4;
UPDATE venue SET state='Maharashtra', latitude=18.5204, longitude=73.8567, address=CONCAT(name, ', ', sub_area, ', Pune') WHERE city_id=5;
UPDATE venue SET state='West Bengal', latitude=22.5726, longitude=88.3639, address=CONCAT(name, ', ', sub_area, ', Kolkata') WHERE city_id=6;
UPDATE venue SET state='Delhi', latitude=28.6139, longitude=77.2090, address=CONCAT(name, ', ', sub_area, ', Delhi') WHERE city_id=7;
UPDATE venue SET state='Andhra Pradesh', latitude=17.6868, longitude=83.2185, address=CONCAT(name, ', ', sub_area, ', Visakhapatnam') WHERE city_id=8;

-- 7. Parks locations by city
UPDATE park SET state='Telangana', latitude=17.4200, longitude=78.4600, address=CONCAT(name, ', ', area, ', Hyderabad') WHERE city_id=1;
UPDATE park SET state='Karnataka', latitude=12.9750, longitude=77.6000, address=CONCAT(name, ', ', area, ', Bengaluru') WHERE city_id=2;
UPDATE park SET state='Maharashtra', latitude=19.0800, longitude=72.8800, address=CONCAT(name, ', ', area, ', Mumbai') WHERE city_id=3;
UPDATE park SET state='Tamil Nadu', latitude=13.0850, longitude=80.2750, address=CONCAT(name, ', ', area, ', Chennai') WHERE city_id=4;
UPDATE park SET state='Maharashtra', latitude=18.5250, longitude=73.8600, address=CONCAT(name, ', ', area, ', Pune') WHERE city_id=5;
UPDATE park SET state='West Bengal', latitude=22.5750, longitude=88.3650, address=CONCAT(name, ', ', area, ', Kolkata') WHERE city_id=6;
UPDATE park SET state='Delhi', latitude=28.6150, longitude=77.2100, address=CONCAT(name, ', ', area, ', Delhi') WHERE city_id=7;
UPDATE park SET state='Andhra Pradesh', latitude=17.6900, longitude=83.2200, address=CONCAT(name, ', ', area, ', Visakhapatnam') WHERE city_id=8;

