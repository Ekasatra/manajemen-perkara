import { describe, expect, it } from 'vitest';
import { isRole } from '@ekasatra/shared';

describe('workspace wiring', () => {
  it('menyelesaikan workspace package @ekasatra/shared', () => {
    expect(isRole('admin')).toBe(true);
    expect(isRole('x')).toBe(false);
  });

  it('menjalankan di lingkungan DOM (jsdom)', () => {
    const el = document.createElement('div');
    el.textContent = 'eKaSatra';
    expect(el.textContent).toBe('eKaSatra');
  });
});
