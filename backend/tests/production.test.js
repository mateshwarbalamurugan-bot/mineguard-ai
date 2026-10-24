'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';
const app = require('../server');

describe('Production Static & SPA Fallback Serving', () => {
  it('GET / serves index.html with 200', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('<div id="app"></div>'));
    assert.ok(res.text.includes('Notes Board'));
  });

  it('GET /app serves SPA fallback index.html with 200', async () => {
    const res = await request(app).get('/app');
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('<div id="app"></div>'));
  });

  it('GET /s/test-share-token serves SPA fallback index.html with 200', async () => {
    const res = await request(app).get('/s/0123456789abcdef0123456789abcdef');
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('<div id="app"></div>'));
  });

  it('GET /robots.txt serves robots text file', async () => {
    const res = await request(app).get('/robots.txt');
    assert.equal(res.status, 200);
    assert.ok(res.text.includes('User-agent'));
  });

  it('GET /api/unknown-route does not serve HTML and returns JSON unauthorized 401', async () => {
    const res = await request(app).get('/api/unknown-route');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Unauthorized');
  });
});
