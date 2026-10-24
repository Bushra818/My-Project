-- WORLD CHAOS / NILO — MySQL 8.0+
CREATE TABLE IF NOT EXISTS users (
 id CHAR(36) PRIMARY KEY,
 display_name VARCHAR(40) NOT NULL,
 email VARCHAR(255) NULL UNIQUE,
 password_hash VARCHAR(255) NULL,
 avatar_url TEXT NULL,
 is_anonymous_default BOOLEAN NOT NULL DEFAULT FALSE,
 locale VARCHAR(10) NOT NULL DEFAULT 'ar',
 theme VARCHAR(10) NOT NULL DEFAULT 'dark',
 is_banned BOOLEAN NOT NULL DEFAULT FALSE,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS messages (
 id CHAR(36) PRIMARY KEY,
 user_id CHAR(36) NULL,
 is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
 text VARCHAR(500) NOT NULL,
 category VARCHAR(20) NOT NULL DEFAULT 'عام',
 latitude DECIMAL(9,6) NOT NULL,
 longitude DECIMAL(9,6) NOT NULL,
 visibility VARCHAR(10) NOT NULL DEFAULT 'public',
 visible_after DATETIME(3) NULL,
 is_removed BOOLEAN NOT NULL DEFAULT FALSE,
 reaction_count INT UNSIGNED NOT NULL DEFAULT 0,
 reply_count INT UNSIGNED NOT NULL DEFAULT 0,
 reply_to CHAR(36) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 client_ip_hash CHAR(64) NULL,
 CONSTRAINT fk_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_messages_reply FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE CASCADE,
 INDEX idx_messages_lat_lng (latitude,longitude),
 INDEX idx_messages_created (created_at),
 INDEX idx_messages_category (category),
 INDEX idx_messages_visible (is_removed,visible_after,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS reactions (
 id CHAR(36) PRIMARY KEY,
 message_id CHAR(36) NOT NULL,
 user_id CHAR(36) NULL,
 anon_key VARCHAR(255) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT fk_reactions_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
 CONSTRAINT fk_reactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
 UNIQUE KEY uq_reaction_user (message_id,user_id),
 UNIQUE KEY uq_reaction_anon (message_id,anon_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS drawings (
 id CHAR(36) PRIMARY KEY,
 user_id CHAR(36) NULL,
 is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
 latitude DECIMAL(9,6) NOT NULL,
 longitude DECIMAL(9,6) NOT NULL,
 vector_data JSON NOT NULL,
 mode VARCHAR(12) NOT NULL DEFAULT 'normal',
 ghost_lifetime_seconds INT UNSIGNED NULL,
 is_removed BOOLEAN NOT NULL DEFAULT FALSE,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT fk_drawings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
 INDEX idx_drawings_lat_lng (latitude,longitude),
 INDEX idx_drawings_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS reports (
 id CHAR(36) PRIMARY KEY,
 target_type VARCHAR(10) NOT NULL,
 target_id CHAR(36) NOT NULL,
 reporter_user_id CHAR(36) NULL,
 reason VARCHAR(300) NOT NULL,
 status VARCHAR(12) NOT NULL DEFAULT 'pending',
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT fk_reports_user FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE SET NULL,
 INDEX idx_reports_status (status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS blocks (
 blocker_id CHAR(36) NOT NULL,
 blocked_id CHAR(36) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (blocker_id,blocked_id),
 CONSTRAINT fk_blocks_blocker FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT fk_blocks_blocked FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS favorites (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 user_id CHAR(36) NOT NULL,
 label VARCHAR(80) NOT NULL,
 latitude DECIMAL(9,6) NOT NULL,
 longitude DECIMAL(9,6) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX idx_favorites_location (latitude,longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
