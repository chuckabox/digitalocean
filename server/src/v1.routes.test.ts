import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('./services/nudge.js', () => ({
  phraseNudge: vi.fn(),
}));

vi.mock('./services/debrief.js', () => ({
  streamDebrief: vi.fn(),
}));

vi.mock('./repositories/sessions.js', () => ({
  createSession: vi.fn(),
  getSession: vi.fn(),
  endSession: vi.fn(),
}));

vi.mock('./repositories/frames.js', () => ({
  insertFrames: vi.fn(),
  getFrames: vi.fn(),
}));

import { createApp } from './app.js';
import { phraseNudge } from './services/nudge.js';
import { streamDebrief } from './services/debrief.js';
import * as sessionsRepo from './repositories/sessions.js';
import * as framesRepo from './repositories/frames.js';

const phraseNudgeMock = vi.mocked(phraseNudge);
const streamDebriefMock = vi.mocked(streamDebrief);
const createSessionMock = vi.mocked(sessionsRepo.createSession);
const getSessionMock = vi.mocked(sessionsRepo.getSession);
const insertFramesMock = vi.mocked(framesRepo.insertFrames);

describe('/v1 routes (hermetic)', () => {
  const app = createApp();
  const sessionId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /v1/nudge validates and returns phrased nudge', async () => {
    phraseNudgeMock.mockResolvedValueOnce({
      text: 'Maybe ask a question?',
      confidence: 'medium',
      evidence: ['gaze away 9s'],
    });
    const res = await request(app)
      .post('/v1/nudge')
      .send({ confidence: 'medium', evidence: ['gaze away 9s'] });
    expect(res.status).toBe(200);
    expect(res.body.text).toMatch(/question/i);
  });

  it('POST /v1/nudge -> 422 on bad body', async () => {
    const res = await request(app).post('/v1/nudge').send({ confidence: 'medium' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('POST /v1/sessions creates a session', async () => {
    createSessionMock.mockResolvedValueOnce({
      id: sessionId,
      createdAt: new Date('2026-07-12T00:00:00.000Z'),
      endedAt: null,
      context: 'friend catch-up',
    });
    const res = await request(app).post('/v1/sessions').send({ context: 'friend catch-up' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(sessionId);
    expect(res.body.createdAt).toBe('2026-07-12T00:00:00.000Z');
  });

  it('POST /v1/frames inserts when session exists', async () => {
    getSessionMock.mockResolvedValueOnce({
      id: sessionId,
      createdAt: new Date(),
      endedAt: null,
      context: null,
    });
    insertFramesMock.mockResolvedValueOnce(2);
    const res = await request(app)
      .post('/v1/frames')
      .send({
        sessionId,
        frames: [
          { t: 0, engagement: 0.8 },
          { t: 1, engagement: 0.7 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ inserted: 2 });
  });

  it('POST /v1/debrief streams SSE deltas then done', async () => {
    streamDebriefMock.mockImplementationOnce(async function* () {
      yield 'Hi ';
      yield 'there.';
    });
    const res = await request(app)
      .post('/v1/debrief')
      .send({ transcript: [], frames: [{ t: 0, engagement: 0.5 }] });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.text).toContain('"type":"delta"');
    expect(res.text).toContain('"type":"done"');
    expect(res.text).toContain('Hi ');
  });
});
