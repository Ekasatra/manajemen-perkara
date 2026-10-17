/**
 * Konteks auth per-request, dimemoize dengan React.cache.
 * Layout dan page memanggil ini berulang dalam satu request, tetapi
 * supabase.auth.getUser() + query profiles hanya dijalankan SEKALI per request.
 * Cache otomatis ter-reset di setiap request baru.
 */
import { cache } from 'react';
import { createDb } from '@ekasatra/db';
import { requireUser, type AuthContext } from '@ekasatra/core';
import { createSupabaseServerClient } from './supabase-server';

export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  return requireUser(db, supabase);
});
