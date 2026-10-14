CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  project_id CHAR(36) NULL,
  user_id CHAR(36) NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NULL,
  resource_id VARCHAR(100) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_project_created (project_id, created_at),
  INDEX idx_audit_user_created (user_id, created_at),
  INDEX idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;