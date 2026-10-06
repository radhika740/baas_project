USE baas_db;

ALTER TABLE api_keys
  ADD COLUMN key_prefix VARCHAR(20) NOT NULL DEFAULT '' AFTER key_type;

INSERT IGNORE INTO permissions (id, name, resource, action) VALUES
  (UUID(), 'api-keys:create', 'api-keys', 'create'),
  (UUID(), 'api-keys:read',   'api-keys', 'read'),
  (UUID(), 'api-keys:delete', 'api-keys', 'delete');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('Owner', 'Admin')
  AND p.name IN ('api-keys:create', 'api-keys:read', 'api-keys:delete');