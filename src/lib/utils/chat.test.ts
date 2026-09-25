import { describe, expect, it } from 'vitest';

import { buildChatId, buildParticipants, getOtherParticipantId, parseChatId } from './chat';

const ORG = 'org-uid-1';
const SPEC = 'spec-uid-2';

describe('chat id helpers', () => {
  it('builds the legacy chat id format chat_{org}_{spec}', () => {
    expect(buildChatId(ORG, SPEC)).toBe(`chat_${ORG}_${SPEC}`);
  });

  it('parses a valid chat id', () => {
    expect(parseChatId(`chat_${ORG}_${SPEC}`)).toEqual({ orgId: ORG, specId: SPEC });
  });

  it('rejects malformed chat ids', () => {
    expect(parseChatId('random_id')).toBeNull();
    expect(parseChatId('chat_onlyone')).toBeNull();
    expect(parseChatId('')).toBeNull();
  });

  it('resolves the counterpart for each role (fixed legacy off-by-one)', () => {
    const chatId = buildChatId(ORG, SPEC);
    expect(getOtherParticipantId(chatId, 'spec')).toBe(ORG);
    expect(getOtherParticipantId(chatId, 'org')).toBe(SPEC);
    expect(getOtherParticipantId('bad', 'spec')).toBeNull();
  });

  it('derives participants in [org, spec] order', () => {
    expect(buildParticipants(buildChatId(ORG, SPEC))).toEqual([ORG, SPEC]);
    expect(buildParticipants('invalid')).toBeNull();
  });
});