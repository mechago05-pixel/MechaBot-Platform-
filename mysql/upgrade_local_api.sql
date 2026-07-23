-- Run this once on an existing MechaBot MySQL database after pulling the local API update.
USE mechabot;

CREATE TABLE IF NOT EXISTS mechanic_ratings (
  id CHAR(36) PRIMARY KEY,
  request_id CHAR(36) NOT NULL UNIQUE,
  client_id CHAR(36) NOT NULL,
  mechanic_id CHAR(36) NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mechanic_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (rating BETWEEN 1 AND 5)
);
