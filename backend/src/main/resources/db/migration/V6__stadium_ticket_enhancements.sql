-- Flyway migration V6: Enhance Stadium, StandCategory and Booking for complete Stadium Tickets lifecycle

-- 1. Alter stadium table
ALTER TABLE stadium ADD COLUMN IF NOT EXISTS capacity INT;
ALTER TABLE stadium ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2);
ALTER TABLE stadium ADD COLUMN IF NOT EXISTS image VARCHAR(500);

-- 2. Alter stand_category table
ALTER TABLE stand_category ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 500;

-- 3. Alter booking table
ALTER TABLE booking ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);
ALTER TABLE booking ADD COLUMN IF NOT EXISTS customer_email VARCHAR(150);
ALTER TABLE booking ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE booking ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'PENDING';
ALTER TABLE booking ADD COLUMN IF NOT EXISTS ticket_code VARCHAR(100);
ALTER TABLE booking ADD COLUMN IF NOT EXISTS qr_data TEXT;
ALTER TABLE booking ADD COLUMN IF NOT EXISTS qr_used BOOLEAN DEFAULT FALSE;
ALTER TABLE booking ADD COLUMN IF NOT EXISTS qr_used_at TIMESTAMP;

-- 4. Update stadium details (capacities, ratings, images)
UPDATE stadium SET capacity=55000, rating=4.8, image='https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80' WHERE id=201; -- Rajiv Gandhi International Stadium
UPDATE stadium SET capacity=33108, rating=4.9, image='https://images.unsplash.com/photo-1589487391730-58f20eb2c308?auto=format&fit=crop&w=1200&q=80' WHERE id=224; -- Wankhede Stadium
UPDATE stadium SET capacity=20000, rating=4.6, image='https://images.unsplash.com/photo-1531415074868-836332ff4296?auto=format&fit=crop&w=1200&q=80' WHERE id=225; -- Brabourne Stadium
UPDATE stadium SET capacity=38200, rating=4.8, image='https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80' WHERE id=240; -- MA Chidambaram Stadium (Chepauk)
UPDATE stadium SET capacity=37406, rating=4.7, image='https://images.unsplash.com/photo-1577471488278-16eec37ffcc2?auto=format&fit=crop&w=1200&q=80' WHERE id=241; -- MCA Stadium, Pune
UPDATE stadium SET capacity=68000, rating=4.9, image='https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80' WHERE id=242; -- Eden Gardens, Kolkata
UPDATE stadium SET capacity=41000, rating=4.7, image='https://images.unsplash.com/photo-1563299796-17596ed6b017?auto=format&fit=crop&w=1200&q=80' WHERE id=243; -- Arun Jaitley Stadium, Delhi
UPDATE stadium SET capacity=27500, rating=4.6, image='https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80' WHERE id=244; -- ACA-VDCA Stadium, Visakhapatnam

-- Default fallback for any other stadium
UPDATE stadium SET capacity=25000, rating=4.5 WHERE capacity IS NULL;

-- 5. Stand category capacities
UPDATE stand_category SET capacity=250 WHERE id=1; -- North Stand
UPDATE stand_category SET capacity=200 WHERE id=2; -- South Stand
UPDATE stand_category SET capacity=30  WHERE id=3; -- VIP / Premium Stand
UPDATE stand_category SET capacity=250 WHERE id=4; -- East Stand
UPDATE stand_category SET capacity=150 WHERE id=5; -- West Stand

