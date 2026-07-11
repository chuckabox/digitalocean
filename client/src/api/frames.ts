import type { FramesIngestRequest, FramesIngestResponse, FramesListResponse } from 'shared';
import { jsonFetch } from './base';

export function ingestFrames(body: FramesIngestRequest) {
  return jsonFetch<FramesIngestResponse>('/v1/frames', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listFrames(sessionId: string) {
  return jsonFetch<FramesListResponse>(`/v1/sessions/${sessionId}/frames`);
}
