import type { SessionCreateRequest, SessionResponse } from 'shared';
import { jsonFetch } from './base';

export function createSession(body: SessionCreateRequest = {}) {
  return jsonFetch<SessionResponse>('/v1/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getSession(id: string) {
  return jsonFetch<SessionResponse>(`/v1/sessions/${id}`);
}

export function endSession(id: string) {
  return jsonFetch<SessionResponse>(`/v1/sessions/${id}/end`, { method: 'POST' });
}
