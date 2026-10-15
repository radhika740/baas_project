const BASE = 'http://localhost:3000/api/v1';

async function call(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

function randomPhone() {
  return '9' + Math.floor(100000000 + Math.random() * 900000000);
}

async function makeUserWithProject(label: string) {
  const phone = randomPhone();
  const password = 'TestPass2026!';
  await call('POST', '/auth/register', undefined, { phone, password, firstName: 'Test', lastName: 'User' });
  const login = await call('POST', '/auth/login', undefined, { phone, password });
  const token = login.json?.data?.accessToken;
  const project = await call('POST', '/projects', token, { name: `Project ${label}` });
  return { token, projectId: project.json?.data?.id };
}

describe('Tenant isolation and validation', () => {
  let userA: { token: string; projectId: string };
  let userB: { token: string; projectId: string };

  beforeAll(async () => {
    userA = await makeUserWithProject('A');
    userB = await makeUserWithProject('B');
  });

  it('creates both users and projects', () => {
    expect(userA.token).toBeDefined();
    expect(userA.projectId).toBeDefined();
    expect(userB.token).toBeDefined();
    expect(userB.projectId).toBeDefined();
  });

  it("user A cannot read user B's project", async () => {
    const r = await call('GET', `/projects/${userB.projectId}`, userA.token);
    expect([403, 404]).toContain(r.status);
  });

  it("user A cannot read user B's records", async () => {
    const r = await call('GET', `/projects/${userB.projectId}/resources/tasks/records`, userA.token);
    expect([403, 404]).toContain(r.status);
  });

  it("user A cannot create records in user B's project", async () => {
    const r = await call('POST', `/projects/${userB.projectId}/resources/tasks/records`, userA.token, { data: { title: 'hack' } });
    expect([403, 404]).toContain(r.status);
  });

  it('request without a token is rejected', async () => {
    const r = await call('GET', `/projects/${userA.projectId}`);
    expect(r.status).toBe(401);
  });

  it('bad input is rejected with a validation error', async () => {
    const r = await call('POST', '/auth/register', undefined, { phone: 'abc', password: '1' });
    expect(r.status).toBe(400);
    expect(r.json?.success).toBe(false);
  });
});
