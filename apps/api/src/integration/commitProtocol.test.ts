import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import commitProtocolRoutes from '../routes/commitProtocol.routes';

// Build a minimal Express app with just the commit-protocol routes.
// No database needed — these endpoints use pure simulation services.
const app = express();
app.use(express.json());
app.use('/api/commit-protocols', commitProtocolRoutes);

describe('Commit Protocols API (Integration)', () => {
  it('GET /compare should return 2PC vs 3PC vs Saga comparison', async () => {
    const res = await request(app).get('/api/commit-protocols/compare');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data['2PC']).toBeDefined();
    expect(res.body.data['3PC']).toBeDefined();
    expect(res.body.data['saga']).toBeDefined();

    // 2PC is blocking, 3PC is non-blocking — a key course concept
    expect(res.body.data['2PC'].blocking).toBe(true);
    expect(res.body.data['3PC'].blocking).toBe(false);
  });

  it('POST /2pc with all_success should COMMIT', async () => {
    const res = await request(app)
      .post('/api/commit-protocols/2pc')
      .send({ scenario: 'all_success', participantCount: '3' });

    expect(res.status).toBe(200);
    expect(res.body.data.outcome).toBe('COMMITTED');
  });

  it('POST /2pc with coordinator_fails should BLOCK', async () => {
    const res = await request(app)
      .post('/api/commit-protocols/2pc')
      .send({ scenario: 'coordinator_fails', participantCount: '3' });

    expect(res.status).toBe(200);
    expect(res.body.data.outcome).toBe('BLOCKED');
    expect(res.body.data.blockingDetected).toBe(true);
  });

  it('POST /3pc with coordinator_fails should RECOVER (non-blocking)', async () => {
    const res = await request(app)
      .post('/api/commit-protocols/3pc')
      .send({ scenario: 'coordinator_fails', participantCount: '3' });

    expect(res.status).toBe(200);
    expect(res.body.data.outcome).toBe('RECOVERED_AFTER_FAILURE');
    expect(res.body.data.blockingDetected).toBe(false);
  });

  it('POST /2pc should reject invalid scenario', async () => {
    const res = await request(app)
      .post('/api/commit-protocols/2pc')
      .send({ scenario: 'invalid_scenario' });

    expect(res.status).toBe(400);
  });
});