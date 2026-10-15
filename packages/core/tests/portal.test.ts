import { describe, expect, it, vi } from 'vitest';
import {
  validateClientPortalAccess,
  getVerifiedClientDocument,
} from '../src/portal';
import { PORTAL_GENERIC_ERROR_MESSAGE } from '@ekasatra/shared';

describe('Portal Klien (G3 & PRD §5.12)', () => {
  it('token salah melempar pesan galat generik yang sama', async () => {
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any;

    await expect(
      validateClientPortalAccess(fakeDb, 'token-salah-12345'),
    ).rejects.toThrow(PORTAL_GENERIC_ERROR_MESSAGE);
  });

  it('portal dinonaktifkan (portalEnabled = false) melempar pesan galat generik yang SAMA PERSIS', async () => {
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'c-1',
                name: 'PT Klien Nonaktif',
                clientCode: 'KL-0001',
                email: 'klien@example.com',
                phone: '08123456789',
                portalEnabled: false,
              },
            ]),
          }),
        }),
      }),
    } as any;

    await expect(
      validateClientPortalAccess(fakeDb, 'token-valid-tapi-nonaktif'),
    ).rejects.toThrow(PORTAL_GENERIC_ERROR_MESSAGE);
  });

  it('token kosong atau spasi melempar pesan galat generik', async () => {
    const fakeDb = {} as any;
    await expect(validateClientPortalAccess(fakeDb, '   ')).rejects.toThrow(
      PORTAL_GENERIC_ERROR_MESSAGE,
    );
  });

  it('unduh file memverifikasi kepemilikan file oleh klien dan sharedWithClient', async () => {
    let callCount = 0;
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return {
                limit: vi.fn().mockResolvedValue([
                  {
                    id: 'client-1',
                    name: 'Klien A',
                    clientCode: 'KL-0001',
                    portalEnabled: true,
                  },
                ]),
              };
            }
            return {
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              }),
            };
          }),
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    } as any;

    await expect(
      getVerifiedClientDocument(fakeDb, 'valid-token', 'doc-unauthorized'),
    ).rejects.toThrow(PORTAL_GENERIC_ERROR_MESSAGE);
  });
});

