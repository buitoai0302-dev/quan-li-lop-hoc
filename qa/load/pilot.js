import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate } from 'k6/metrics';

const baseUrl = (__ENV.STAGING_API_URL || '').replace(/\/$/, '');
if (__ENV.STAGING_CONFIRMATION !== 'isolated-synthetic-staging' ||
    !/^https?:\/\/[^/]*staging[^/]*$/i.test(baseUrl)) {
  throw new Error('Load test requires an explicitly named staging host and confirmation');
}

const users = new SharedArray('synthetic staging users', () => {
  const fixture = JSON.parse(open(__ENV.STAGING_USERS_FILE || './users.local.json'));
  if (!Array.isArray(fixture) || fixture.length < 50) {
    throw new Error('Provide at least 50 distinct synthetic user accounts');
  }
  if (new Set(fixture.map((user) => user.email)).size !== fixture.length) {
    throw new Error('Staging users must have distinct email addresses');
  }
  return fixture;
});

export const options = {
  scenarios: {
    pilot_50_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '15m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    unexpected_errors: ['rate<0.01'],
    'http_req_duration{api:dashboard}': ['p(95)<2000'],
    'http_req_duration{api:schedule}': ['p(95)<2000'],
    'http_req_duration{api:classes}': ['p(95)<2000'],
    'http_req_duration{api:students}': ['p(95)<2000'],
    'http_req_duration{api:tuitions}': ['p(95)<2000'],
  },
};

const unexpectedErrors = new Rate('unexpected_errors');
let token;
let iterationsSinceLogin = 0;

const request = (method, path, body, api) => {
  const response = http.request(method, `${baseUrl}${path}`, body ? JSON.stringify(body) : null, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { api },
  });
  unexpectedErrors.add(response.status < 200 || response.status >= 300);
  return response;
};

export default function () {
  const user = users[(__VU - 1) % users.length];
  if (!token || iterationsSinceLogin >= 10) {
    const response = http.post(`${baseUrl}/api/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password,
    }), { headers: { 'Content-Type': 'application/json' }, tags: { api: 'login' } });
    unexpectedErrors.add(response.status !== 200);
    if (!check(response, { 'login succeeded': (result) => result.status === 200 })) {
      sleep(3);
      return;
    }
    token = response.json('token');
    iterationsSinceLogin = 0;
  }

  const today = new Date().toISOString().slice(0, 10);
  const paths = [
    ['/api/dashboard/stats', 'dashboard'],
    [`/api/schedule/weekly?startDate=${today}`, 'schedule'],
    ['/api/classes', 'classes'],
    ['/api/students', 'students'],
    ['/api/tuitions', 'tuitions'],
  ];
  const [path, api] = paths[Math.floor(Math.random() * paths.length)];
  request('GET', path, null, api);

  // About one safe, repeatable student update per 25 iterations.
  if (user.writeStudentId && user.writeStudentName && Math.random() < 0.04) {
    request('PUT', `/api/students/${user.writeStudentId}`,
      { full_name: user.writeStudentName }, 'student_write');
  }

  iterationsSinceLogin += 1;
  sleep(1 + Math.random() * 2);
}
