import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/settings/read', () => ({ getSetting: vi.fn(async (_d, k, def) => settingsMock[k] ?? def) }));
vi.mock('../src/users/read', () => ({
  getUserNotificationProfile: vi.fn(),
  getMultipleUserNotificationProfiles: vi.fn(async () => profilesMock),
}));

const settingsMock: Record<string, unknown> = {};
let profilesMock: any[] = [];

import { notifyGeneric, renderEmailTemplate, setEmailTransport } from '../src/notifications';

const base = { subject: 'Surat <b>X</b>', body: 'Baris 1\nBaris 2', preference: 'email_approval' as const };
const user = (o: object) => ({ id: 'u1', email: 'a@x.id', fullName: 'Ani', isActive: true, emailApproval: true, emailDisposisi: true, ...o });

describe('notifyGeneric (REQ-E1)', () => {
  const sent: any[] = [];
  beforeEach(() => {
    sent.length = 0;
    for (const k of Object.keys(settingsMock)) delete settingsMock[k];
    profilesMock = [];
    setEmailTransport(async (p) => (sent.push(p), { success: true, messageId: 'm' }));
  });

  it('hormati preferensi & nonaktif, kirim ke yang boleh', async () => {
    profilesMock = [user({}), user({ id: 'u2', email: 'b@x.id', emailApproval: false }), user({ id: 'u3', email: 'c@x.id', isActive: false })];
    const r = await notifyGeneric({} as any, { ...base, toUserIds: ['u1', 'u2', 'u3'] });
    expect(r.map((x) => x.reason ?? 'sent')).toEqual(['sent', 'disabled_by_user_preference', 'user_inactive']);
    expect(sent).toHaveLength(1);
    expect(sent[0].html).toContain('Surat &lt;b&gt;X&lt;/b&gt;');
    expect(sent[0].html).toContain('Baris 1<br>Baris 2');
  });

  it('notif_email_enabled=false memblokir user tetapi tidak penerima eksternal', async () => {
    settingsMock.notif_email_enabled = false;
    profilesMock = [user({})];
    const r = await notifyGeneric({} as any, { ...base, toUserIds: ['u1'], toEmails: ['klien@x.id'] });
    expect(r[0]).toMatchObject({ sent: false, reason: 'disabled_by_settings' });
    expect(r[1]).toMatchObject({ sent: true, recipientEmail: 'klien@x.id' });
  });

  it('lampiran diunduh sekali dan diteruskan', async () => {
    const load = vi.fn(async () => 'QUJD');
    await notifyGeneric({} as any, { ...base, toUserIds: [], toEmails: ['a@x.id', 'b@x.id'], attachments: [{ bucket: 'b', path: 'p', fileName: 'S.pdf' }] }, load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(sent.map((s) => s.attachments)).toEqual([[{ filename: 'S.pdf', content: 'QUJD' }], [{ filename: 'S.pdf', content: 'QUJD' }]]);
  });
});

describe('renderEmailTemplate', () => {
  it('escape HTML dari data user, subject tetap teks polos', () => {
    const r = renderEmailTemplate(
      { type: 'surat_reject', recipientUserId: 'u', data: { suratId: 's', subject: 'A & <i>B</i>', rejecterName: '<script>x</script>', reason: '"alasan"' } } as any,
      'Budi <b>',
    );
    expect(r.subject).toContain('A & <i>B</i>');
    expect(r.html).not.toContain('<script>');
    expect(r.html).toContain('&lt;script&gt;');
    expect(r.html).toContain('Budi &lt;b&gt;');
  });
});
