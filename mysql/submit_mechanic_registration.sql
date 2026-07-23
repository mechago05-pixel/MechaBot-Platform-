-- MySQL 8 / WAMP equivalent of Supabase's submit_mechanic_registration RPC.
--
-- Prerequisites:
--   * mechanic_profiles.user_id has a UNIQUE index.
--   * user_roles has a UNIQUE index on (user_id, role).
--   * user_id columns use CHAR(36) UUIDs (or change the parameter type).
--   * specialties is a JSON column (not PostgreSQL text[]).
--
-- The calling PHP/API layer must obtain p_user_id from its authenticated
-- session or token. Never accept it directly from an untrusted browser.

DELIMITER $$

DROP PROCEDURE IF EXISTS submit_mechanic_registration $$

CREATE PROCEDURE submit_mechanic_registration(
  IN p_user_id CHAR(36),
  IN p_full_name VARCHAR(255),
  IN p_nida_number VARCHAR(255),
  IN p_email VARCHAR(255),
  IN p_phone VARCHAR(50),
  IN p_experience_years INT,
  IN p_specialties JSON,
  IN p_garage_location VARCHAR(255),
  IN p_lat DOUBLE,
  IN p_lng DOUBLE,
  IN p_profile_image_url TEXT
)
BEGIN
  IF p_user_id IS NULL OR CHAR_LENGTH(TRIM(p_user_id)) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You must be signed in to register as a mechanic';
  END IF;

  IF CHAR_LENGTH(TRIM(COALESCE(p_full_name, ''))) < 2
     OR CHAR_LENGTH(TRIM(COALESCE(p_nida_number, ''))) < 4
     OR CHAR_LENGTH(TRIM(COALESCE(p_phone, ''))) < 7
     OR p_experience_years NOT BETWEEN 0 AND 80
     OR p_specialties IS NULL
     OR JSON_VALID(p_specialties) = 0
     OR JSON_TYPE(p_specialties) <> 'ARRAY'
     OR JSON_LENGTH(p_specialties) = 0
     OR CHAR_LENGTH(TRIM(COALESCE(p_garage_location, ''))) < 2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Please provide valid mechanic registration details';
  END IF;

  INSERT INTO mechanic_profiles (
    user_id, full_name, nida_number, email, phone, experience_years,
    specialties, garage_location, lat, lng, profile_image_url, approval_status,
    created_at, updated_at
  ) VALUES (
    p_user_id, TRIM(p_full_name), TRIM(p_nida_number), LOWER(TRIM(p_email)),
    TRIM(p_phone), p_experience_years, p_specialties, TRIM(p_garage_location),
    p_lat, p_lng, p_profile_image_url, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
  ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    nida_number = VALUES(nida_number),
    email = VALUES(email),
    phone = VALUES(phone),
    experience_years = VALUES(experience_years),
    specialties = VALUES(specialties),
    garage_location = VALUES(garage_location),
    lat = VALUES(lat),
    lng = VALUES(lng),
    profile_image_url = COALESCE(VALUES(profile_image_url), profile_image_url),
    approval_status = IF(approval_status = 'rejected', 'pending', approval_status),
    updated_at = CURRENT_TIMESTAMP;

  UPDATE user_roles
  SET role = 'mechanic'
  WHERE user_id = p_user_id AND role = 'client';

  IF ROW_COUNT() = 0 THEN
    INSERT IGNORE INTO user_roles (user_id, role)
    VALUES (p_user_id, 'mechanic');
  END IF;
END $$

DELIMITER ;

-- Example: CALL submit_mechanic_registration(
--   'user-uuid', 'Jane Doe', 'NIDA-1234', 'jane@example.com', '+255700000000',
--   5, JSON_ARRAY('Engine repair', 'Diagnostics'), 'Dar es Salaam',
--   -6.7924, 39.2083, NULL
-- );
