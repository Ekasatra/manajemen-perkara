/**
 * Data dummy demo, sinkron dengan matriks hak akses (PRD §4) dan `scope_assigned_only`.
 *   pnpm --filter @ekasatra/db seed:demo            hapus data demo lama lalu isi ulang
 *   pnpm --filter @ekasatra/db seed:demo -- --reset hanya hapus data demo
 *
 * Perlu: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Akun baru memakai SEED_DEMO_PASSWORD (min 8); bila kosong dibuat acak dan dicetak sekali.
 *
 * Penanda data demo (satu-satunya yang dihapus saat reset; akun pengguna tidak pernah dihapus):
 *   perkara REG/{tahun}/9xxx, klien KL-9xxx, invoice INV/{tahun}/9xxx, surat masuk SM/{tahun}/9xxx,
 *   surat keluar berakhiran -DMO/{tahun}, pihak lawan bercatatan "Data demo", log aktivitas
 *   bermetadata {"demo":true}. Semua tanggal relatif terhadap hari ini (WIB), jadi dashboard
 *   selalu berisi agenda dan tenggat yang masih berlaku.
 *
 * Siapa melihat apa (hasil yang diharapkan, dicetak di akhir):
 *   Admin     : semua perkara, invoice, honor draf, laporan, audit, pengguna.
 *   Advokat   : hanya perkara tempat ia menjadi anggota; tanpa invoice/klien/laporan/audit.
 *   Paralegal : sama dengan Advokat, tanpa hak membuat perkara.
 *   Honor     : anggota hanya melihat nilai yang sudah didistribusikan (published_amount).
 */
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL wajib diset');

const resetOnly = process.argv.includes('--reset');
const sql = postgres(databaseUrl, { prepare: false, max: 1 });

/** Tanggal WIB hari ini ditambah n hari. */
const day = (n: number) => sql`((now() at time zone 'Asia/Jakarta')::date + ${n}::int)`;
const ago = (hours: number) => sql`(now() - make_interval(hours => ${hours}::int))`;
const year = new Date().getFullYear();

type Role = 'Admin' | 'Advokat' | 'Paralegal';
type Person = { key: string; email: string; name: string; role: Role; advocate?: boolean };

const PEOPLE: Person[] = [
  {
    key: 'eko',
    email: 'eko.prasetyo@ekasatra.com',
    name: 'Eko Prasetyo, S.H., M.H.',
    role: 'Admin',
  },
  {
    key: 'rangga',
    email: 'advokat@ekasatra.com',
    name: 'Rangga Wibowo, S.H., M.H.',
    role: 'Advokat',
    advocate: true,
  },
  {
    key: 'maya',
    email: 'maya.kusuma@ekasatra.com',
    name: 'Maya Kusuma, S.H.',
    role: 'Advokat',
    advocate: true,
  },
  { key: 'dewi', email: 'paralegal@ekasatra.com', name: 'Dewi Lestari', role: 'Paralegal' },
  { key: 'bagas', email: 'bagas.nugroho@ekasatra.com', name: 'Bagas Nugroho', role: 'Paralegal' },
];

async function ensurePeople(): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  const generated = process.env.SEED_DEMO_PASSWORD || randomBytes(9).toString('base64url');
  let supabase: ReturnType<typeof createClient> | undefined;
  const created: string[] = [];

  for (const p of PEOPLE) {
    const [existing] = await sql`select id from profiles where lower(email) = ${p.email}`;
    if (existing) {
      ids[p.key] = existing.id as string;
      await sql`update profiles set full_name = ${p.name}, role = ${p.role}, is_active = true where id = ${existing.id}`;
      continue;
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diset untuk membuat akun',
      );
    }
    supabase ??= createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await supabase.auth.admin.createUser({
      email: p.email,
      password: generated,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`gagal membuat ${p.email}: ${error?.message}`);
    try {
      await sql`insert into profiles (id, email, full_name, role) values (${data.user.id}, ${p.email}, ${p.name}, ${p.role})`;
    } catch (e) {
      await supabase.auth.admin.deleteUser(data.user.id);
      throw e;
    }
    ids[p.key] = data.user.id;
    created.push(p.email);
  }
  if (created.length > 0) {
    console.log(`akun baru: ${created.join(', ')}  kata sandi: ${generated}`);
  }
  return ids;
}

async function resetDemo() {
  await sql`delete from surat_keluar where no_surat like '%-DMO/%'`;
  await sql`delete from invoices where invoice_no ~ '^INV/[0-9]{4}/9[0-9]{3}$'`;
  await sql`delete from cases where reg_no ~ '^REG/[0-9]{4}/9[0-9]{3}$'`;
  await sql`delete from surat_masuk where no_agenda ~ '^SM/[0-9]{4}/9[0-9]{3}$'`;
  await sql`delete from clients where client_code ~ '^KL-9[0-9]{3}$'`;
  await sql`delete from opponents where notes = 'Data demo'`;
  await sql`delete from activity_logs where metadata->>'demo' = 'true'`;
}

type CaseSeed = {
  no: number;
  title: string;
  client: number;
  opponent: number;
  caseNumber: string;
  court: string;
  caseType: string;
  status: 'Aktif' | 'Banding' | 'Kasasi' | 'Selesai';
  startOffset: number;
  putusOffset?: number;
  upayaOffset?: number;
  closedOffset?: number;
  advokat?: string;
  paralegal?: string;
  timeline: { type: string; offset: number; title: string; description?: string; by: string }[];
  schedules: {
    offset: number;
    time: string;
    kind: string;
    location: string;
    status?: string;
    notes?: string;
  }[];
  honor: { who: string; draft: number; published: number | null; paid?: boolean }[];
};

const CLIENTS = [
  {
    code: 'KL-9001',
    name: 'PT Fintek Karya Nusantara',
    type: 'Perusahaan',
    email: 'legal@fintekkarya.example',
    phone: '021-5550101',
    address: 'Jl. Jenderal Sudirman Kav. 52, Jakarta Selatan',
  },
  {
    code: 'KL-9002',
    name: 'CV Mega Baja Pratama',
    type: 'Perusahaan',
    email: 'direksi@megabaja.example',
    phone: '021-5550102',
    address: 'Kawasan Industri Pulogadung, Jakarta Timur',
  },
  {
    code: 'KL-9003',
    name: 'PT Mineral Nusantara Energi',
    type: 'Perusahaan',
    email: 'corsec@mineralnusantara.example',
    phone: '021-5550103',
    address: 'Jl. HR Rasuna Said Kav. C-22, Jakarta Selatan',
  },
  {
    code: 'KL-9004',
    name: 'Konsorsium Hyundai-Adhi Karya',
    type: 'Perusahaan',
    email: 'contract@hyundai-adhi.example',
    phone: '021-5550104',
    address: 'Jl. MT Haryono Kav. 12, Jakarta Timur',
  },
  {
    code: 'KL-9005',
    name: 'Ibu Ratna Wulandari',
    type: 'Perorangan',
    email: 'ratna.w@mail.example',
    phone: '0812-5550105',
    address: 'Jl. Kemang Raya No. 8, Jakarta Selatan',
  },
];

const OPPONENTS = [
  { name: 'Konsorsium Bank Sentral Niaga', type: 'Perusahaan' },
  { name: 'PT Graha Konstruksi Nusantara', type: 'Perusahaan' },
  { name: 'Direktur Jenderal Mineral dan Batubara', type: 'Instansi' },
  { name: 'PT Pelabuhan Indonesia Persero', type: 'Perusahaan' },
  { name: 'Bapak Hendro Gunawan', type: 'Perorangan' },
];

/** Perkara 1 sampai 8: sebaran anggota membuat tiap role melihat himpunan yang berbeda. */
const CASES: CaseSeed[] = [
  {
    no: 9001,
    title: 'PT Fintek Karya Nusantara vs Konsorsium Bank Sentral Niaga',
    client: 0,
    opponent: 0,
    caseNumber: '714/Pdt.G/2024/PN.Jkt.Pst',
    court: 'PN Jakarta Pusat',
    caseType: 'Wanprestasi',
    status: 'Aktif',
    startOffset: -210,
    advokat: 'rangga',
    paralegal: 'dewi',
    timeline: [
      {
        type: 'Status',
        offset: -210,
        title: 'Perkara didaftarkan',
        description: 'Gugatan wanprestasi perjanjian kredit sindikasi diterima kepaniteraan.',
        by: 'eko',
      },
      { type: 'Dokumen', offset: -90, title: 'Replik diserahkan', by: 'rangga' },
      {
        type: 'Catatan',
        offset: -12,
        title: 'Rapat persiapan saksi ahli',
        description: 'Dua saksi hadir fisik, satu ahli forensik digital hadir daring.',
        by: 'dewi',
      },
    ],
    schedules: [
      {
        offset: 0,
        time: '09:30',
        kind: 'Pembuktian saksi dan ahli',
        location: 'PN Jakarta Pusat, Ruang Kusuma Atmadja',
      },
      {
        offset: 5,
        time: '10:00',
        kind: 'Pemeriksaan bukti surat',
        location: 'PN Jakarta Pusat, Ruang Kusuma Atmadja',
      },
      {
        offset: 1,
        time: '09:00',
        kind: 'Mediasi lanjutan',
        location: 'PN Jakarta Pusat, Ruang Mediasi 2',
      },
      {
        offset: -14,
        time: '09:00',
        kind: 'Replik dan duplik',
        location: 'PN Jakarta Pusat, Ruang Kusuma Atmadja',
        status: 'Selesai',
      },
    ],
    honor: [
      { who: 'rangga', draft: 15_000_000, published: 15_000_000 },
      { who: 'dewi', draft: 5_000_000, published: 5_000_000, paid: true },
    ],
  },
  {
    no: 9002,
    title: 'CV Mega Baja Pratama vs PT Graha Konstruksi Nusantara',
    client: 1,
    opponent: 1,
    caseNumber: '89/Pdt.Sus-PKPU/2025/PN.Niaga.Jkt.Pst',
    court: 'Pengadilan Niaga Jakarta Pusat',
    caseType: 'PKPU',
    status: 'Aktif',
    startOffset: -95,
    advokat: 'maya',
    paralegal: 'bagas',
    timeline: [
      { type: 'Status', offset: -95, title: 'Permohonan PKPU didaftarkan', by: 'eko' },
      { type: 'Dokumen', offset: -6, title: 'Eksepsi kompetensi relatif disusun', by: 'maya' },
    ],
    schedules: [
      {
        offset: 1,
        time: '13:00',
        kind: 'Duplik dan eksepsi',
        location: 'Pengadilan Niaga Jakarta Pusat, Ruang 3',
      },
      {
        offset: 2,
        time: '15:00',
        kind: 'Pemeriksaan permohonan intervensi',
        location: 'Pengadilan Niaga Jakarta Pusat, Ruang 3',
      },
    ],
    honor: [
      { who: 'maya', draft: 12_000_000, published: null },
      { who: 'bagas', draft: 4_000_000, published: 4_000_000 },
    ],
  },
  {
    no: 9003,
    title: 'PT Mineral Nusantara Energi vs Direktur Jenderal Mineral dan Batubara',
    client: 2,
    opponent: 2,
    caseNumber: '142/G/2025/PTUN.JKT',
    court: 'PTUN Jakarta',
    caseType: 'Tata Usaha Negara',
    status: 'Aktif',
    startOffset: -60,
    advokat: 'rangga',
    paralegal: 'bagas',
    timeline: [
      { type: 'Status', offset: -60, title: 'Gugatan TUN didaftarkan', by: 'eko' },
      { type: 'Catatan', offset: -20, title: 'Pemeriksaan persiapan tahap pertama', by: 'rangga' },
    ],
    schedules: [
      {
        offset: 2,
        time: '10:30',
        kind: 'Pemeriksaan persiapan',
        location: 'PTUN Jakarta, Ruang Utama II',
      },
    ],
    honor: [
      { who: 'rangga', draft: 10_000_000, published: 8_000_000 },
      { who: 'bagas', draft: 3_000_000, published: 3_000_000 },
    ],
  },
  {
    no: 9004,
    title: 'Konsorsium Hyundai-Adhi Karya vs PT Pelabuhan Indonesia Persero',
    client: 3,
    opponent: 3,
    caseNumber: '32/ARB/BANI-JKT/2025',
    court: 'BANI Jakarta',
    caseType: 'Arbitrase',
    status: 'Aktif',
    startOffset: -130,
    advokat: 'maya',
    paralegal: 'dewi',
    timeline: [
      { type: 'Status', offset: -130, title: 'Permohonan arbitrase didaftarkan', by: 'eko' },
      { type: 'Dokumen', offset: -30, title: 'Penetapan majelis arbiter diterima', by: 'dewi' },
    ],
    schedules: [
      {
        offset: 4,
        time: '14:00',
        kind: 'Sidang pertama (tertutup)',
        location: 'BANI, Sovereign Plaza lantai 11',
      },
    ],
    honor: [
      { who: 'maya', draft: 9_000_000, published: 9_000_000, paid: true },
      { who: 'dewi', draft: 3_500_000, published: null },
    ],
  },
  {
    no: 9005,
    title: 'Ibu Ratna Wulandari vs Bapak Hendro Gunawan',
    client: 4,
    opponent: 4,
    caseNumber: '455/Pdt.G/2025/PN.Jkt.Sel',
    court: 'PN Jakarta Selatan',
    caseType: 'Waris',
    status: 'Banding',
    startOffset: -300,
    putusOffset: -8,
    upayaOffset: 6,
    advokat: 'rangga',
    paralegal: 'dewi',
    timeline: [
      {
        type: 'Putusan',
        offset: -8,
        title: 'Putusan tingkat pertama dibacakan',
        description: 'Gugatan dikabulkan sebagian; pernyataan banding disiapkan.',
        by: 'rangga',
      },
      { type: 'Banding', offset: -5, title: 'Pernyataan banding diajukan', by: 'dewi' },
    ],
    schedules: [
      {
        offset: 6,
        time: '09:00',
        kind: 'Batas penyerahan memori banding',
        location: 'Kepaniteraan PN Jakarta Selatan',
        notes: 'Tenggat upaya hukum',
      },
    ],
    honor: [
      { who: 'rangga', draft: 7_000_000, published: 7_000_000 },
      { who: 'dewi', draft: 2_500_000, published: 2_500_000 },
    ],
  },
  {
    no: 9006,
    title: 'PT Fintek Karya Nusantara vs PT Graha Konstruksi Nusantara',
    client: 0,
    opponent: 1,
    caseNumber: '301/Pdt.G/2023/PN.Jkt.Pst',
    court: 'PN Jakarta Pusat',
    caseType: 'Wanprestasi',
    status: 'Kasasi',
    startOffset: -520,
    putusOffset: -120,
    upayaOffset: 11,
    advokat: 'maya',
    timeline: [
      {
        type: 'Banding',
        offset: -60,
        title: 'Putusan banding menguatkan putusan pertama',
        by: 'maya',
      },
      { type: 'Kasasi', offset: -4, title: 'Permohonan kasasi diajukan', by: 'maya' },
    ],
    schedules: [],
    honor: [{ who: 'maya', draft: 11_000_000, published: 11_000_000 }],
  },
  {
    no: 9007,
    title: 'CV Mega Baja Pratama vs Bapak Hendro Gunawan',
    client: 1,
    opponent: 4,
    caseNumber: '118/Pdt.G/2024/PN.Jkt.Tim',
    court: 'PN Jakarta Timur',
    caseType: 'Perbuatan Melawan Hukum',
    status: 'Selesai',
    startOffset: -400,
    putusOffset: -150,
    closedOffset: -100,
    advokat: 'rangga',
    paralegal: 'dewi',
    timeline: [
      { type: 'Putusan', offset: -150, title: 'Putusan berkekuatan hukum tetap', by: 'rangga' },
      { type: 'Status', offset: -100, title: 'Perkara ditutup', by: 'eko' },
    ],
    schedules: [],
    honor: [
      { who: 'rangga', draft: 6_000_000, published: 6_000_000, paid: true },
      { who: 'dewi', draft: 2_000_000, published: 2_000_000, paid: true },
    ],
  },
  {
    no: 9008,
    title: 'PT Mineral Nusantara Energi vs PT Pelabuhan Indonesia Persero (kajian internal)',
    client: 2,
    opponent: 3,
    caseNumber: '',
    court: '',
    caseType: 'Kajian hukum',
    status: 'Aktif',
    startOffset: -15,
    // Tanpa anggota non-Admin: hanya Admin yang melihat. Bukti bahwa pembatasan baris bekerja.
    timeline: [{ type: 'Catatan', offset: -15, title: 'Kajian awal dibuka oleh Admin', by: 'eko' }],
    schedules: [
      {
        offset: 9,
        time: '11:00',
        kind: 'Rapat internal pimpinan',
        location: 'Kantor, ruang rapat utama',
      },
    ],
    honor: [],
  },
];

async function seedAll(u: Record<string, string>) {
  const uid = (k: string) => u[k] as string;

  // Data advokat milik akun Advokat (satu akun satu data).
  for (const p of PEOPLE.filter((x) => x.advocate)) {
    const education = sql.json([
      { level: 'S1', institution: 'Universitas Indonesia', year: 2012 },
      { level: 'S2', institution: 'Universitas Gadjah Mada', year: 2016 },
    ]);
    await sql`
      insert into advocates (user_id, full_name, address, phone, bank_name, bank_account, license_number, education, trainings)
      values (${uid(p.key)}, ${p.name}, 'Jakarta Selatan', '0811-5550000', 'Bank Mandiri', ${p.key === 'rangga' ? '1230012345678' : '1230087654321'}, ${'PERADI-' + p.key.toUpperCase()}, ${education}, ${sql.json([{ name: 'Pendidikan Khusus Profesi Advokat', organizer: 'PERADI', year: 2013 }])})
      on conflict (user_id) do update set full_name = excluded.full_name`;
  }

  // Master data.
  const clientId: string[] = [];
  for (const c of CLIENTS) {
    const contacts = sql.json([
      { type: 'Email', value: c.email },
      { type: 'Telepon', value: c.phone },
    ]);
    const [row] = await sql`
      insert into clients (client_code, name, type, contacts, phone, email, address, created_by)
      values (${c.code}, ${c.name}, ${c.type}, ${contacts}, ${c.phone}, ${c.email}, ${c.address}, ${uid('eko')})
      returning id`;
    clientId.push(row!.id as string);
  }
  const opponentId: string[] = [];
  for (const o of OPPONENTS) {
    const [row] = await sql`
      insert into opponents (name, type, contacts, notes, created_by)
      values (${o.name}, ${o.type}, ${sql.json([])}, 'Data demo', ${uid('eko')})
      returning id`;
    opponentId.push(row!.id as string);
  }

  // Perkara, anggota, timeline, jadwal, honor.
  const caseId: Record<number, string> = {};
  for (const c of CASES) {
    const [row] = await sql`
      insert into cases (reg_no, title, client_id, opponent_id, case_number, court, case_type, status, start_date, putus_date, upaya_deadline, closed_date, created_by)
      values (${`REG/${year}/${c.no}`}, ${c.title}, ${clientId[c.client]!}, ${opponentId[c.opponent]!}, ${c.caseNumber || null}, ${c.court || null}, ${c.caseType}, ${c.status},
        ${day(c.startOffset)}, ${c.putusOffset === undefined ? null : day(c.putusOffset)}, ${c.upayaOffset === undefined ? null : day(c.upayaOffset)}, ${c.closedOffset === undefined ? null : day(c.closedOffset)}, ${uid('eko')})
      returning id`;
    const id = row!.id as string;
    caseId[c.no] = id;

    // Admin Eko menjadi Manager semua perkara demo; anggota lain sesuai penugasan.
    await sql`insert into case_members (case_id, user_id, peran) values (${id}, ${uid('eko')}, 'Manager')`;
    if (c.advokat)
      await sql`insert into case_members (case_id, user_id, peran) values (${id}, ${uid(c.advokat)}, 'Advokat')`;
    if (c.paralegal)
      await sql`insert into case_members (case_id, user_id, peran) values (${id}, ${uid(c.paralegal)}, 'Paralegal')`;

    for (const t of c.timeline) {
      await sql`insert into case_timeline (case_id, event_type, event_date, title, description, created_by)
        values (${id}, ${t.type}, ${day(t.offset)}, ${t.title}, ${t.description ?? null}, ${uid(t.by)})`;
    }
    for (const s of c.schedules) {
      await sql`insert into case_schedules (case_id, schedule_date, schedule_time, kind, location, notes, status, created_by)
        values (${id}, ${day(s.offset)}, ${s.time}, ${s.kind}, ${s.location}, ${s.notes ?? null}, ${s.status ?? 'Terjadwal'}, ${uid(c.advokat ?? 'eko')})`;
    }
    for (const h of c.honor) {
      await sql`insert into honor_tim (case_id, user_id, draft_amount, published_amount, published_at, status, paid_at)
        values (${id}, ${uid(h.who)}, ${h.draft}, ${h.published}, ${h.published === null ? null : ago(24 * 20)}, ${h.paid ? 'Dibayar' : 'Belum'}, ${h.paid ? ago(24 * 5) : null})`;
    }
  }

  // Surat masuk: tersebar di beberapa bulan agar grafik tren terisi.
  const masuk: {
    no: number;
    noSurat: string;
    sender: string;
    subject: string;
    offset: number;
    sifat: string;
    status: string;
    caseNo?: number;
    to?: string;
    note?: string;
  }[] = [
    {
      no: 9001,
      noSurat: '1204/PAN/PN.JKT.PST/2026',
      sender: 'Panitera PN Jakarta Pusat',
      subject: 'Relaas panggilan sidang pembuktian perkara 714/Pdt.G/2024',
      offset: 0,
      sifat: 'Segera',
      status: 'Belum',
      caseNo: 9001,
      to: 'dewi',
    },
    {
      no: 9002,
      noSurat: 'KH/BSN/078/2026',
      sender: 'Kuasa hukum Konsorsium Bank Sentral Niaga',
      subject: 'Jawaban atas bukti surat Penggugat',
      offset: -2,
      sifat: 'Biasa',
      status: 'Didisposisi',
      caseNo: 9001,
      to: 'rangga',
      note: 'Mohon dianalisis untuk bahan pemeriksaan bukti surat.',
    },
    {
      no: 9003,
      noSurat: '57/PKPU/PN.NIAGA/2026',
      sender: 'Pengadilan Niaga Jakarta Pusat',
      subject: 'Pemberitahuan jadwal duplik',
      offset: -1,
      sifat: 'Segera',
      status: 'Belum',
      caseNo: 9002,
      to: 'bagas',
    },
    {
      no: 9004,
      noSurat: 'W2.TUN1/412/2026',
      sender: 'PTUN Jakarta',
      subject: 'Panggilan pemeriksaan persiapan',
      offset: -4,
      sifat: 'Biasa',
      status: 'Selesai',
      caseNo: 9003,
      to: 'bagas',
    },
    {
      no: 9005,
      noSurat: 'BANI/2026/0332',
      sender: 'Sekretariat BANI',
      subject: 'Penetapan majelis arbiter',
      offset: -3,
      sifat: 'Penting',
      status: 'Didisposisi',
      caseNo: 9004,
      to: 'maya',
      note: 'Periksa potensi konflik kepentingan arbiter sebelum sidang pertama.',
    },
    {
      no: 9006,
      noSurat: 'ESDM/KEB/221/2026',
      sender: 'Kementerian ESDM',
      subject: 'Tanggapan atas keberatan administratif',
      offset: -9,
      sifat: 'Biasa',
      status: 'Selesai',
      to: 'rangga',
    },
    {
      no: 9007,
      noSurat: 'UND/118/2026',
      sender: 'PT Fintek Karya Nusantara',
      subject: 'Undangan rapat evaluasi tahunan',
      offset: -38,
      sifat: 'Biasa',
      status: 'Selesai',
      to: 'eko',
    },
    {
      no: 9008,
      noSurat: 'DJP/PAJAK/044/2026',
      sender: 'KPP Pratama Jakarta Tebet',
      subject: 'Permintaan klarifikasi pajak kantor',
      offset: -66,
      sifat: 'Biasa',
      status: 'Selesai',
      to: 'eko',
    },
    {
      no: 9009,
      noSurat: 'ASN/PERADI/09/2026',
      sender: 'DPN PERADI',
      subject: 'Pemberitahuan pembaruan kartu advokat',
      offset: -97,
      sifat: 'Biasa',
      status: 'Selesai',
      to: 'rangga',
    },
    {
      no: 9010,
      noSurat: 'HKM/LKPP/501/2026',
      sender: 'Biro Hukum LKPP',
      subject: 'Permohonan pendapat hukum pengadaan',
      offset: -128,
      sifat: 'Biasa',
      status: 'Selesai',
      to: 'maya',
    },
  ];
  for (const m of masuk) {
    await sql`insert into surat_masuk (no_agenda, no_surat, sender, subject, tgl_surat, tgl_terima, sifat, status, case_id, assigned_to, disposisi_note, created_by)
      values (${`SM/${year}/${m.no}`}, ${m.noSurat}, ${m.sender}, ${m.subject}, ${day(m.offset - 1)}, ${day(m.offset)}, ${m.sifat}, ${m.status},
        ${m.caseNo ? caseId[m.caseNo]! : null}, ${m.to ? uid(m.to) : null}, ${m.note ?? null}, ${uid('dewi')})`;
  }

  // Surat keluar: tiap status alur persetujuan ada satu; reviewer/penandatangan menentukan siapa yang
  // melihat "menunggu persetujuan Anda" di beranda.
  const keluar: {
    seq: number;
    kepada: string;
    perihal: string;
    jenis: 'Perkara' | 'Instansi';
    caseNo?: number;
    status: string;
    offset: number;
    by: string;
    reviewer: string;
    signer: string;
    log: [string, string, string, string][];
  }[] = [
    {
      seq: 1,
      kepada: 'Majelis Hakim PN Jakarta Pusat',
      perihal: 'Daftar bukti surat Penggugat',
      jenis: 'Perkara',
      caseNo: 9001,
      status: 'Review',
      offset: -1,
      by: 'dewi',
      reviewer: 'rangga',
      signer: 'eko',
      log: [['Submit', 'dewi', 'Draft', 'Review']],
    },
    {
      seq: 2,
      kepada: 'Pengadilan Niaga Jakarta Pusat',
      perihal: 'Duplik Tergugat II dan eksepsi kompetensi relatif',
      jenis: 'Perkara',
      caseNo: 9002,
      status: 'Siap_TTD',
      offset: 0,
      by: 'bagas',
      reviewer: 'maya',
      signer: 'eko',
      log: [
        ['Submit', 'bagas', 'Draft', 'Review'],
        ['Approve', 'maya', 'Review', 'Siap_TTD'],
      ],
    },
    {
      seq: 3,
      kepada: 'PTUN Jakarta',
      perihal: 'Daftar saksi dan ahli',
      jenis: 'Perkara',
      caseNo: 9003,
      status: 'Draft',
      offset: 0,
      by: 'rangga',
      reviewer: 'eko',
      signer: 'eko',
      log: [],
    },
    {
      seq: 4,
      kepada: 'Kementerian ESDM',
      perihal: 'Keberatan administratif lanjutan',
      jenis: 'Instansi',
      status: 'Ditandatangani',
      offset: -3,
      by: 'rangga',
      reviewer: 'eko',
      signer: 'eko',
      log: [
        ['Submit', 'rangga', 'Draft', 'Review'],
        ['Approve', 'eko', 'Review', 'Siap_TTD'],
        ['Sign', 'eko', 'Siap_TTD', 'Ditandatangani'],
      ],
    },
    {
      seq: 5,
      kepada: 'PT Fintek Karya Nusantara',
      perihal: 'Laporan perkembangan perkara kuartal ini',
      jenis: 'Perkara',
      caseNo: 9001,
      status: 'Terkirim',
      offset: -22,
      by: 'rangga',
      reviewer: 'eko',
      signer: 'eko',
      log: [
        ['Submit', 'rangga', 'Draft', 'Review'],
        ['Approve', 'eko', 'Review', 'Siap_TTD'],
        ['Sign', 'eko', 'Siap_TTD', 'Ditandatangani'],
        ['Send', 'eko', 'Ditandatangani', 'Terkirim'],
      ],
    },
    {
      seq: 6,
      kepada: 'BANI Jakarta',
      perihal: 'Tanggapan penetapan majelis arbiter',
      jenis: 'Perkara',
      caseNo: 9004,
      status: 'Terkirim',
      offset: -52,
      by: 'maya',
      reviewer: 'eko',
      signer: 'eko',
      log: [['Send', 'eko', 'Ditandatangani', 'Terkirim']],
    },
    {
      seq: 7,
      kepada: 'DPN PERADI',
      perihal: 'Konfirmasi pembaruan kartu advokat',
      jenis: 'Instansi',
      status: 'Terkirim',
      offset: -90,
      by: 'rangga',
      reviewer: 'eko',
      signer: 'eko',
      log: [['Send', 'eko', 'Ditandatangani', 'Terkirim']],
    },
  ];
  for (const k of keluar) {
    const noSurat = `${String(k.seq).padStart(3, '0')}/EKA-DMO/${year}`;
    const signed = ['Ditandatangani', 'Terkirim'].includes(k.status);
    const [row] = await sql`
      insert into surat_keluar (no_surat, tgl_surat, kepada, perihal, jenis, case_id, status, created_by, reviewer_id, signer_id, file_path, file_name, signed_file_path, signed_at, sent_at)
      values (${noSurat}, ${day(k.offset)}, ${k.kepada}, ${k.perihal}, ${k.jenis}, ${k.caseNo ? caseId[k.caseNo]! : null}, ${k.status}, ${uid(k.by)}, ${uid(k.reviewer)}, ${uid(k.signer)},
        ${`demo/surat/${noSurat.replaceAll('/', '-')}.pdf`}, ${`${noSurat.replaceAll('/', '-')}.pdf`}, ${signed ? `demo/surat/${noSurat.replaceAll('/', '-')}-ttd.pdf` : null},
        ${signed ? day(k.offset) : null}, ${k.status === 'Terkirim' ? day(k.offset) : null})
      returning id`;
    for (const [action, actor, from, to] of k.log) {
      const name = PEOPLE.find((p) => p.key === actor)!.name;
      await sql`insert into surat_approval_logs (surat_id, action, actor_id, actor_name, from_status, to_status)
        values (${row!.id as string}, ${action}, ${uid(actor)}, ${name}, ${from}, ${to})`;
    }
  }

  // Keuangan: hanya Admin yang boleh melihat invoice (policy invoices = CRUD Admin saja).
  const invoices = [
    {
      no: 9001,
      client: 0,
      caseNo: 9001,
      desc: 'Retainer dan biaya jasa tahap pembuktian',
      amount: 75_000_000,
      paid: 75_000_000,
      inv: -60,
      due: -30,
    },
    {
      no: 9002,
      client: 0,
      caseNo: 9001,
      desc: 'Biaya ahli forensik digital',
      amount: 50_000_000,
      paid: 20_000_000,
      inv: -20,
      due: 5,
    },
    {
      no: 9003,
      client: 1,
      caseNo: 9002,
      desc: 'Retainer perkara PKPU',
      amount: 40_000_000,
      paid: 0,
      inv: -10,
      due: 12,
    },
    {
      no: 9004,
      client: 2,
      caseNo: 9003,
      desc: 'Biaya jasa gugatan TUN tahap persiapan',
      amount: 30_000_000,
      paid: 0,
      inv: -40,
      due: -10,
    },
    {
      no: 9005,
      client: 3,
      caseNo: 9004,
      desc: 'Biaya pendaftaran dan jasa arbitrase',
      amount: 90_000_000,
      paid: 45_000_000,
      inv: -30,
      due: 20,
    },
    {
      no: 9006,
      client: 4,
      caseNo: undefined,
      desc: 'Konsultasi hukum waris',
      amount: 15_000_000,
      paid: 15_000_000,
      inv: -70,
      due: -55,
    },
  ];
  for (const i of invoices) {
    await sql`insert into invoices (invoice_no, client_id, case_id, description, amount, paid_amount, invoice_date, due_date, paid_date, created_by)
      values (${`INV/${year}/${i.no}`}, ${clientId[i.client]!}, ${i.caseNo ? caseId[i.caseNo]! : null}, ${i.desc}, ${i.amount}, ${i.paid}, ${day(i.inv)}, ${day(i.due)},
        ${i.paid >= i.amount ? day(i.due) : null}, ${uid('eko')})`;
  }

  // Log aktivitas untuk panel "Aktivitas terbaru".
  const logs: [string, string, string, string, number][] = [
    ['eko', 'Membuat', 'Perkara', 'REG/' + year + '/9008 dibuka sebagai kajian internal', 2],
    ['rangga', 'Mengubah', 'Perkara', 'Status perkara 455/Pdt.G/2025 menjadi Banding', 30],
    ['dewi', 'Mengunggah', 'Surat keluar', 'Draf daftar bukti surat Penggugat', 20],
    ['maya', 'Menyetujui', 'Surat keluar', 'Duplik Tergugat II siap ditandatangani', 5],
    ['bagas', 'Membuat', 'Surat masuk', 'Pemberitahuan jadwal duplik dicatat', 26],
    ['eko', 'Mengubah', 'Honor tim', 'Honor perkara 714/Pdt.G/2024 didistribusikan', 48],
  ];
  for (const [who, action, module, description, hours] of logs) {
    const name = PEOPLE.find((p) => p.key === who)!.name;
    await sql`insert into activity_logs (user_id, user_name, action, module, description, metadata, created_at)
      values (${uid(who)}, ${name}, ${action}, ${module}, ${description}, ${sql.json({ demo: true })}, ${ago(hours)})`;
  }
}

async function report() {
  const rows = await sql`
    select p.full_name, p.role,
      case when p.role = 'Admin' then (select count(*) from cases where reg_no ~ '^REG/[0-9]{4}/9[0-9]{3}$')
           else (select count(*) from case_members m join cases c on c.id = m.case_id
                 where m.user_id = p.id and c.reg_no ~ '^REG/[0-9]{4}/9[0-9]{3}$') end as perkara_terlihat,
      (select count(*) from honor_tim h join cases c on c.id = h.case_id
         where h.user_id = p.id and h.published_amount is not null and c.reg_no ~ '^REG/[0-9]{4}/9[0-9]{3}$') as honor_terlihat
    from profiles p
    where lower(p.email) = any(${PEOPLE.map((x) => x.email)})
    order by p.role, p.full_name`;
  console.log(
    '\nHimpunan yang terlihat per akun (perkara demo, honor yang sudah didistribusikan):',
  );
  for (const r of rows)
    console.log(
      `  ${String(r.role).padEnd(10)} ${String(r.full_name).padEnd(28)} perkara=${r.perkara_terlihat}  honor=${r.honor_terlihat}`,
    );
}

try {
  await resetDemo();
  console.log('data demo lama dihapus');
  if (!resetOnly) {
    const people = await ensurePeople();
    await seedAll(people);
    console.log('data demo terisi');
    await report();
  }
} finally {
  await sql.end();
}
