export const ALL_PERMISSIONS = [
  'projects:read',
  'projects:update',
  'projects:delete',
  'members:read',
  'members:create',
  'members:update',
  'members:delete',
  'records:create',
  'records:read',
  'records:update',
  'records:delete',
  'users:read',
  'users:update',
  'users:delete',
  'roles:read',
] as const;

export const DEFAULT_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  Owner: ALL_PERMISSIONS,
  Admin: ALL_PERMISSIONS.filter((p) => p !== 'projects:delete'),
  Developer: [
    'projects:read',
    'members:read',
    'users:read',
    'roles:read',
    'records:create',
    'records:read',
    'records:update',
    'records:delete',
  ],
  Viewer: [
    'projects:read',
    'members:read',
    'users:read',
    'roles:read',
    'records:read',
  ],
};
