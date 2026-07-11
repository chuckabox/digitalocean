import type { NudgeRequest, NudgeResponse } from 'shared';
import { jsonFetch } from './base';

export function requestNudge(body: NudgeRequest) {
  return jsonFetch<NudgeResponse>('/v1/nudge', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
