USE baas_db;

INSERT IGNORE INTO permissions (id, name, resource, action) VALUES
  (UUID(), 'resources:create', 'resources', 'create'),
  (UUID(), 'resources:read',   'resources', 'read'),
  (UUID(), 'resources:update', 'resources', 'update'),
  (UUID(), 'resources:delete', 'resources', 'delete');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE (r.name IN ('Owner', 'Admin')
       AND p.name IN ('resources:create', 'resources:read', 'resources:update', 'resources:delete'))
   OR (r.name = 'Developer'
       AND p.name IN ('resources:create', 'resources:read', 'resources:update'))
   OR (r.name = 'Viewer' AND p.name = 'resources:read');

ALTER TABLE api_keys ADD UNIQUE KEY uq_api_keys_hash (key_hash);