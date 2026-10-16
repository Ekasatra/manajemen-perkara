/**
 * Satu-satunya tempat nama aplikasi dan penanda merek. Logo "E" bertanda bintang emas dan
 * nama kantor diambil dari aplikasi GAS (sumber resmi dari klien); tidak digambar ulang.
 */
export const APP_NAME = 'eKaSatra';

/** Nama kantor yang tampil di portal klien (nilai sama dengan default pengaturan kantor). */
export const FIRM_NAME = 'EKASATRA Law & Policy Advisory';

/** Huruf E mengikuti `currentColor` (putih di panel gelap, navy di latar terang); bintang selalu emas. */
export function LogoMark({ size = 34, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <path d="M10 6H90V27H33V73H90V94H10Z" fill="currentColor" />
      <path
        d="M61 29C62.6 44.5 65.5 47.4 81 49.9C65.5 52.4 62.6 55.4 61 71C59.4 55.4 56.5 52.4 41 49.9C56.5 47.4 59.4 44.5 61 29Z"
        fill="#B38B4D"
      />
    </svg>
  );
}

/**
 * `full` = logo mendatar (sidebar), `vertical` = logo bertumpuk (login mobile),
 * `compact` = tanda + nama saja. `light` untuk latar gelap.
 */
export function Brand({
  variant = 'full',
  light = false,
  size,
  className = '',
}: {
  variant?: 'full' | 'vertical' | 'compact';
  light?: boolean;
  size?: number;
  className?: string;
}) {
  const color = light ? 'text-white' : 'text-navy-800';
  const sub = light ? 'text-white/70' : 'text-navy-600';
  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center ${color} ${className}`}>
        <LogoMark size={size ?? 64} />
        <div className="mt-5 font-display text-[34px] font-semibold leading-none tracking-[0.22em]">
          EKASATRA
        </div>
        <div className={`mt-3 text-[11px] font-medium tracking-[0.32em] ${sub}`}>
          LAW &amp; POLICY ADVISORY
        </div>
      </div>
    );
  }
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
  return (
    <div className={`flex items-center gap-3 ${color} ${className}`}>
      <LogoMark size={size ?? 34} />
      <span aria-hidden="true" className="h-9 w-px bg-gold-500" />
      <div>
        <div className="font-display text-[22px] font-semibold leading-none tracking-[0.2em]">
          EKASATRA
        </div>
        <div className={`mt-1 text-[8.5px] tracking-[0.28em] ${sub}`}>
          LAW &amp; POLICY ADVISORY
        </div>
      </div>
    </div>
  );
}
