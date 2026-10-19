/**
 * Satu-satunya tempat nama aplikasi dan penanda merek. Logo "E" bertanda bintang emas dan
 * nama kantor diambil dari aplikasi GAS (sumber resmi dari klien); tidak digambar ulang.
 */
export const APP_NAME = 'eKaSatra';

/** Nama kantor yang tampil di portal klien (nilai sama dengan default pengaturan kantor). */
export const FIRM_NAME = 'EKASATRA Law & Policy Advisory';

/** Huruf E mengikuti `currentColor` (putih di panel gelap, navy di latar terang); bintang selalu emas. */
export const LOGO_MARK_VIEWBOX = '0 0 100 100';

/**
 * Geometri penanda merek — satu sumber untuk shell (SVG DOM) dan kop PDF.
 * `currentColor` berarti "ikut warna teks induk". Jangan digambar ulang di tempat lain.
 */
export const LOGO_MARK_PATHS = [
  { d: 'M10 6H90V27H33V73H90V94H10Z', fill: 'currentColor' },
  {
    d: 'M61 29C62.6 44.5 65.5 47.4 81 49.9C65.5 52.4 62.6 55.4 61 71C59.4 55.4 56.5 52.4 41 49.9C56.5 47.4 59.4 44.5 61 29Z',
    fill: '#B38B4D',
  },
] as const;

export function LogoMark({ size = 34, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={LOGO_MARK_VIEWBOX}
      aria-hidden="true"
      className={className}
    >
      {LOGO_MARK_PATHS.map((path) => (
        <path key={path.d} d={path.d} fill={path.fill} />
      ))}
    </svg>
  );
}

/**
 * `full` = logo mendatar (sidebar), `vertical` = logo bertumpuk (login mobile),
 * `compact` = tanda + nama saja. `light` untuk latar gelap.
 * `full` dan `vertical` memakai file SVG resmi di /public/brand (teks sudah berupa path).
 */
export function Brand({
  variant = 'full',
  light,
  size,
  className = '',
}: {
  variant?: 'full' | 'vertical' | 'compact';
  light?: boolean;
  size?: number;
  className?: string;
}) {
  const color = light ? 'text-white' : 'text-navy-800 dark:text-white';
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${color} ${className}`}>
        <LogoMark size={size ?? 26} />
        <span className="font-display text-xl font-semibold leading-none tracking-[0.2em]">
          EKASATRA
        </span>
      </div>
    );
  }
  const kind = variant === 'vertical' ? 'stacked' : 'horizontal';
  // viewBox logo: mendatar 628x136 (penanda 102 tinggi), bertumpuk 617x423 (penanda 157 tinggi).
  const height = variant === 'vertical' ? (size ?? 64) * 2.7 : (size ?? 34) * 1.33;
  const img = (tone: 'navy' | 'white', extra = '', alt = FIRM_NAME) => (
    // eslint-disable-next-line @next/next/no-img-element -- SVG statis; next/image tidak menambah nilai
    <img
      src={`/brand/ekasatra-logo-${kind}-${tone}.svg`}
      alt={alt}
      style={{ height, width: 'auto' }}
      className={`${className} ${extra}`}
    />
  );
  // `light` tak diisi = ikut tema (navy di terang, putih di gelap).
  if (light === undefined) return <>{img('navy', 'dark:hidden')}{img('white', 'hidden dark:block', '')}</>;
  return img(light ? 'white' : 'navy');
}
