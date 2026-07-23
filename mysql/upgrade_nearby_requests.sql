-- Migration: Add client location columns to service_requests for proximity-based matching
-- This allows mechanics to receive only requests that are near their current location

ALTER TABLE service_requests 
ADD COLUMN client_lat DOUBLE NULL AFTER vehicle_size,
ADD COLUMN client_lng DOUBLE NULL AFTER client_lat;

-- Also add an index for better query performance on location-based searches
ALTER TABLE service_requests ADD INDEX request_client_location (client_lat, client_lng);