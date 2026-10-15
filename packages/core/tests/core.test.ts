import { describe, expect, it } from 'vitest';
import { AppError, isAppError } from '../src';

describe('core', () => {
  it('mengekspos AppError dari shared', () => {
    const err = new AppError('FORBIDDEN', 'Tidak boleh', 403);
    expect(isAppError(err)).toBe(true);
    expect(err.status).toBe(403);
    expect(isAppError(new Error('biasa'))).toBe(false);
  });
});
