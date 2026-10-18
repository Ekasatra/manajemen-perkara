/**
 * Dokumen PDF invoice & kuitansi (Agent F · F3; W5) dengan kop dari Pengaturan.
 * Hanya dipakai di server (renderToBuffer). Font bawaan Helvetica; tanpa dependensi font.
 * Logo kop: pakai berkas unggahan Pengaturan bila ada, selain itu penanda merek milik shell
 * (`LOGO_MARK_PATHS`) — tidak ada URL yang di-hardcode.
 */
import {
  Document,
  Image,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import { terbilang } from '@ekasatra/core/finance';
import type { InvoiceStatus } from '@ekasatra/shared/invoices';
import { LOGO_MARK_PATHS, LOGO_MARK_VIEWBOX } from '@/components/ui/brand';
import { formatDate, formatRupiah } from '@/lib/format';

export interface Letterhead {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo: { data: Buffer; format: 'png' | 'jpg' } | null;
}

export interface PdfInvoice {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string | null;
  paidDate: string | null;
  description: string | null;
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  clientName: string | null;
  caseLabel: string | null;
}

const NAVY = '#1A2E44';
const GOLD = '#B38B4D';
const GREEN = '#15803d';

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1f2937' },
  head: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    paddingBottom: 10,
    marginBottom: 18,
  },
  logo: { width: 52, height: 52, marginRight: 12, objectFit: 'contain' },
  brandMark: { width: 52, height: 52, marginRight: 12 },
  office: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: NAVY },
  muted: { color: '#4b5563', marginTop: 2 },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 110, color: '#4b5563' },
  value: { flex: 1 },
  table: { marginTop: 14, borderTopWidth: 1, borderColor: '#d1d5db' },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingVertical: 6 },
  th: { fontFamily: 'Helvetica-Bold', color: NAVY },
  colDesc: { flex: 1 },
  colAmt: { width: 120, textAlign: 'right' },
  bold: { fontFamily: 'Helvetica-Bold' },
  sign: { marginTop: 48, alignItems: 'flex-end' },
  signBox: { width: 180, textAlign: 'center' },
  signLine: { marginTop: 56, borderTopWidth: 1, borderColor: '#6b7280', paddingTop: 4 },
  words: { marginTop: 10, padding: 8, backgroundColor: '#f3f4f6', fontFamily: 'Helvetica-Oblique' },
  stamp: {
    position: 'absolute',
    top: 44,
    right: 40,
    borderWidth: 2,
    borderColor: GREEN,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    transform: 'rotate(-12deg)',
  },
  stampText: { color: GREEN, fontFamily: 'Helvetica-Bold', fontSize: 20, letterSpacing: 2 },
});

/** Kop tanpa berkas unggahan: gambar penanda merek yang sama dengan sidebar (bukan URL). */
function BrandMark() {
  return (
    <Svg width={52} height={52} viewBox={LOGO_MARK_VIEWBOX} style={s.brandMark}>
      {LOGO_MARK_PATHS.map((path) => (
        <Path key={path.d} d={path.d} fill={path.fill === 'currentColor' ? NAVY : path.fill} />
      ))}
    </Svg>
  );
}

function Head({ lh }: { lh: Letterhead }) {
  return (
    <View style={s.head}>
      {lh.logo ? (
        // eslint-disable-next-line jsx-a11y/alt-text -- Image @react-pdf, bukan <img>
        <Image src={{ data: lh.logo.data, format: lh.logo.format }} style={s.logo} />
      ) : (
        <BrandMark />
      )}
      <View>
        <Text style={s.office}>{lh.name || 'EKASATRA Law & Policy Advisory'}</Text>
        {lh.address ? <Text style={s.muted}>{lh.address}</Text> : null}
        {lh.phone || lh.email ? (
          <Text style={s.muted}>{[lh.phone, lh.email].filter(Boolean).join('  ·  ')}</Text>
        ) : null}
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: string }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{children}</Text>
    </View>
  );
}

/** Judul dokumen: invoice biasa, atau "TANDA TERIMA" saat lunas (PRD masukan §4 R4). */
export function invoiceDocumentTitle(status: InvoiceStatus): string {
  return status === 'Lunas' ? 'TANDA TERIMA' : 'INVOICE';
}

export function InvoiceDocument({ lh, inv }: { lh: Letterhead; inv: PdfInvoice }) {
  const sisa = Math.max(inv.amount - inv.paidAmount, 0);
  const lunas = inv.status === 'Lunas';
  return (
    <Document title={`${lunas ? 'Tanda terima' : 'Invoice'} ${inv.invoiceNo}`} author={lh.name}>
      <Page size="A4" style={s.page}>
        <Head lh={lh} />
        {lunas ? (
          <View style={s.stamp}>
            <Text style={s.stampText}>LUNAS</Text>
          </View>
        ) : null}
        <Text style={s.title}>{invoiceDocumentTitle(inv.status)}</Text>
        <Field label="No. Invoice">{inv.invoiceNo}</Field>
        <Field label="Tanggal">{formatDate(inv.invoiceDate)}</Field>
        <Field label="Jatuh tempo">{formatDate(inv.dueDate)}</Field>
        <Field label="Kepada">{inv.clientName ?? '-'}</Field>
        {inv.caseLabel ? <Field label="Perkara">{inv.caseLabel}</Field> : null}

        <View style={s.table}>
          <View style={s.tr}>
            <Text style={[s.colDesc, s.th]}>Keterangan</Text>
            <Text style={[s.colAmt, s.th]}>Jumlah</Text>
          </View>
          <View style={s.tr}>
            <Text style={s.colDesc}>{inv.description || 'Biaya perkara'}</Text>
            <Text style={s.colAmt}>{formatRupiah(inv.amount)}</Text>
          </View>
          <View style={s.tr}>
            <Text style={s.colDesc}>Sudah dibayar</Text>
            <Text style={s.colAmt}>{formatRupiah(inv.paidAmount)}</Text>
          </View>
          <View style={s.tr}>
            <Text style={[s.colDesc, s.bold]}>Sisa tagihan</Text>
            <Text style={[s.colAmt, s.bold]}>{formatRupiah(sisa)}</Text>
          </View>
        </View>
        <Text style={s.words}>Terbilang: {capitalize(terbilang(inv.amount))} rupiah</Text>
        {lunas ? null : <Text style={[s.muted, { marginTop: 10 }]}>Status: {inv.status}</Text>}

        <View style={s.sign}>
          <View style={s.signBox}>
            <Text>{lh.name}</Text>
            <Text style={s.signLine}>Hormat kami</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function ReceiptDocument({ lh, inv }: { lh: Letterhead; inv: PdfInvoice }) {
  const partial = inv.paidAmount < inv.amount;
  return (
    <Document title={`Kuitansi ${inv.invoiceNo}`} author={lh.name}>
      <Page size="A5" orientation="landscape" style={s.page}>
        <Head lh={lh} />
        <Text style={s.title}>KUITANSI</Text>
        <Field label="Untuk invoice">{inv.invoiceNo}</Field>
        <Field label="Telah terima dari">{inv.clientName ?? '-'}</Field>
        <Field label="Uang sejumlah">{`${capitalize(terbilang(inv.paidAmount))} rupiah`}</Field>
        <Field label="Untuk pembayaran">
          {[inv.description || 'Biaya perkara', inv.caseLabel].filter(Boolean).join(' — ')}
        </Field>
        {partial ? (
          <Field label="Keterangan">
            {`Pembayaran sebagian dari tagihan ${formatRupiah(inv.amount)}`}
          </Field>
        ) : null}
        <Text style={[s.words, s.bold]}>{formatRupiah(inv.paidAmount)}</Text>
        <View style={s.sign}>
          <View style={s.signBox}>
            <Text>{formatDate(inv.paidDate ?? new Date())}</Text>
            <Text style={s.signLine}>{lh.name}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function renderInvoicePdf(lh: Letterhead, inv: PdfInvoice): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument lh={lh} inv={inv} />);
}

export function renderReceiptPdf(lh: Letterhead, inv: PdfInvoice): Promise<Buffer> {
  return renderToBuffer(<ReceiptDocument lh={lh} inv={inv} />);
}
