/**
 * Middleware — proteksi rute & refresh sesi Supabase (Agent C · C1).
 * Rute publik: /login, /setup, /api/v1/auth/{login,logout,setup}.
 * Rute lain wajib login; bila tidak ada sesi → redirect /login (API: 401 JSON).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/login', '/setup', '/set-password'];
const PUBLIC_API = ['/api/v1/auth/login', '/api/v1/auth/logout', '/api/v1/auth/setup'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (PUBLIC_API.some((p) => pathname === p)) return true;
  // Agent G: portal klien dijaga token di path; cron dijaga CRON_SECRET (tanpa sesi login).
  if (pathname.startsWith('/portal/') || pathname.startsWith('/api/v1/portal/')) return true;
  if (pathname === '/api/cron/reminders') return true;
  return false;
}

/** Tanpa sesi: API → 401 JSON (agar klien bisa menampilkan pesan); halaman → redirect /login. */
function unauthenticated(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Sesi berakhir. Silakan login ulang.' } },
      { status: 401 },
    );
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Jangan ganggu aset statis & rute publik.
  if (isPublic(path)) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return unauthenticated(request);
  }

  const response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh sesi (memperbarui token bila akan kedaluwarsa).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthenticated(request);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
