import { describe, expect, it } from 'vitest';
import { isRole, ROLES } from '../src/common';

describe('common', () => {
  it('memvalidasi role yang dikenal', () => {
    expect(ROLES).toContain('admin');
    expect(isRole('advokat')).toBe(true);
    expect(isRole('hackerman')).toBe(false);
    expect(isRole(null)).toBe(false);
  });
});
