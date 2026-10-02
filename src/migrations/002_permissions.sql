USE baas_db;

INSERT IGNORE INTO permissions (id, name, resource, action) VALUES
  (UUID(), 'projects:delete', 'projects', 'delete'),
  (UUID(), 'members:read',    'members',  'read'),
  (UUID(), 'members:create',  'members',  'create'),
  (UUID(), 'members:update',  'members',  'update'),
  (UUID(), 'members:delete',  'members',  'delete'),
  (UUID(), 'users:delete',    'users',    'delete'),
  (UUID(), 'roles:read',      'roles',    'read');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Owner'
   OR (r.name = 'Admin' AND p.name <> 'projects:delete')
   OR (r.name = 'Developer' AND p.name IN (
        'projects:read', 'members:read', 'users:read', 'roles:read',
        'records:create', 'records:read', 'records:update', 'records:delete'))
   OR (r.name = 'Viewer' AND p.name IN (
        'projects:read', 'members:read', 'users:read', 'roles:read', 'records:read'));