import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import { query } from '../src/db.js';

process.env.ADMIN_PASSWORD ??= 'test-parola';

describe('Info Session API', () => {
  beforeAll(async () => {
    await query('DELETE FROM participants');
  });

  afterAll(async () => {
    await query('DELETE FROM participants');
  });

  const validAnswers = {
    crowd: 4,
    starter: 3,
    interests: ['tech', 'art'],
    style: 'talker',
    goal: 'network',
    dept: 'engineering',
    friday: 'out',
    drink: 'coffee'
  };

  it('GET /api/health should return ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  let participantId;

  it('POST /api/participants should create a participant in waiting status before distribution', async () => {
    const res = await request(app).post('/api/participants').send({
      name: 'Test User',
      deviceId: 'test-device-1',
      answers: validAnswers
    });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test User');
    expect(res.body.status).toBe('waiting');
    expect(res.body.tableNumber).toBeNull();
    participantId = res.body.id;
  });

  it('POST /api/participants should return 409 for duplicate device', async () => {
    const res = await request(app).post('/api/participants').send({
      name: 'Test User 2',
      deviceId: 'test-device-1',
      answers: validAnswers
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('already_registered');
    expect(res.body.error.details.participantId).toBe(participantId);
  });

  it('GET /api/participants/:id should return waiting participant', async () => {
    const res = await request(app).get(`/api/participants/${participantId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(participantId);
    expect(res.body.status).toBe('waiting');
  });

  let adminToken;
  it('POST /api/admin/login should return token for valid password', async () => {
    const res = await request(app).post('/api/admin/login').send({
      password: process.env.ADMIN_PASSWORD
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    adminToken = res.body.token;
  });

  it('POST /api/admin/login should return 401 for invalid password', async () => {
    const res = await request(app).post('/api/admin/login').send({
      password: 'wrong'
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/rebalance should distribute waiting participants into tables', async () => {
    const res = await request(app)
      .post('/api/admin/rebalance')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totals.seated).toBe(1);
    expect(res.body.totals.waiting).toBe(0);

    // Now participant should be seated
    const pRes = await request(app).get(`/api/participants/${participantId}`);
    expect(pRes.status).toBe(200);
    expect(pRes.body.status).toBe('seated');
    expect(pRes.body.tableNumber).toBeTypeOf('number');
  });

  it('POST /api/participants after distribution should place latecomer into tables', async () => {
    const res = await request(app).post('/api/participants').send({
      name: 'Latecomer User',
      deviceId: 'test-device-late',
      answers: validAnswers
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('seated');
    expect(res.body.tableNumber).toBeTypeOf('number');
  });

  it('GET /api/admin/export.csv should require auth', async () => {
    const res = await request(app).get('/api/admin/export.csv');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/export.csv should export data', async () => {
    const res = await request(app)
      .get('/api/admin/export.csv')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Test User');
  });

  it('PATCH /api/participants/:id/table should move participant', async () => {
    const res = await request(app)
      .patch(`/api/participants/${participantId}/table`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tableNumber: 2 });
    
    expect(res.status).toBe(200);
    expect(res.body.tableNumber).toBe(2);
  });

  it('DELETE /api/participants/:id should require auth', async () => {
    const res = await request(app).delete(`/api/participants/${participantId}`);
    expect(res.status).toBe(401);
  });

  it('DELETE /api/participants/:id should return 404 for non-existent id', async () => {
    const res = await request(app)
      .delete('/api/participants/non-existent-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('DELETE /api/participants/:id should delete participant', async () => {
    const res = await request(app)
      .delete(`/api/participants/${participantId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.deleted.id).toBe(participantId);

    // After deletion, GET should return 404
    const getRes = await request(app).get(`/api/participants/${participantId}`);
    expect(getRes.status).toBe(404);
  });

  it('POST /api/admin/seed should require auth', async () => {
    const res = await request(app).post('/api/admin/seed').send({ count: 30 });
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/seed should simulate 30 participants', async () => {
    await query('DELETE FROM participants');
    const res = await request(app)
      .post('/api/admin/seed')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ count: 30 });
    expect(res.status).toBe(200);
    expect(res.body.added).toBe(30);

    const tablesRes = await request(app).get('/api/tables');
    expect(tablesRes.status).toBe(200);
    expect(tablesRes.body.totals.participants).toBe(30);
    expect(tablesRes.body.totals.waiting).toBe(30);
  });

  it('POST /api/participants race condition capacity test (50 parallel + rebalance + 25 latecomers)', async () => {
    // Clear DB to test capacity
    await query('DELETE FROM participants');

    const reqs = [];
    for (let i = 0; i < 50; i++) {
      reqs.push(
        request(app).post('/api/participants').send({
          name: `Parallel User ${i}`,
          deviceId: `parallel-device-${i}`,
          answers: validAnswers
        })
      );
    }
    const responses = await Promise.all(reqs);
    
    let waitingCount = 0;
    for (const r of responses) {
      if (r.status === 200 && r.body.status === 'waiting') waitingCount++;
    }
    expect(waitingCount).toBe(50);

    // Admin triggers distribution
    const rebalanceRes = await request(app)
      .post('/api/admin/rebalance')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(rebalanceRes.status).toBe(200);
    expect(rebalanceRes.body.totals.seated).toBe(50);
    expect(rebalanceRes.body.totals.waiting).toBe(0);

    // Now 25 latecomers arrive after distribution
    const reqs2 = [];
    for (let i = 50; i < 75; i++) {
      reqs2.push(
        request(app).post('/api/participants').send({
          name: `Parallel User ${i}`,
          deviceId: `parallel-device-${i}`,
          answers: validAnswers
        })
      );
    }
    const responses2 = await Promise.all(reqs2);
    
    let seated2 = 0;
    let waitlist2 = 0;
    for (const r of responses2) {
      if (r.status === 201 && r.body.status === 'seated') seated2++;
      if (r.status === 200 && r.body.status === 'waitlist') waitlist2++;
    }
    
    expect(seated2).toBe(22); // 72 - 50 = 22 available seats
    expect(waitlist2).toBe(3); // 75 - 72 = 3 overflow to waitlist

    const tablesRes = await request(app).get('/api/tables');
    expect(tablesRes.status).toBe(200);
    for (const t of tablesRes.body.tables) {
      expect(t.count).toBeLessThanOrEqual(6);
    }
    expect(tablesRes.body.totals.seated).toBe(72);
    expect(tablesRes.body.totals.waitlisted).toBe(3);
  });
});
