import { describe, expect, it } from 'vitest';
import { makeActivityCursor, parseActivityCursor } from './activity-log.cursor';

describe('activity-log cursor', () => {
  it('makeActivityCursor / parseActivityCursor roundtrip', () => {
    const c = makeActivityCursor(1234, 'abc');
    expect(parseActivityCursor(c)).toEqual({ createdAtMs: 1234, id: 'abc' });
  });

  it('parseActivityCursor returns null for invalid values', () => {
    expect(parseActivityCursor('')).toBeNull();
    expect(parseActivityCursor('nope')).toBeNull();
    expect(parseActivityCursor(':id')).toBeNull();
    expect(parseActivityCursor('abc:id')).toBeNull();
  });
});

