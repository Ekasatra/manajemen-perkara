/**
 * Registry modul untuk sidebar (Agent A · A4).
 * Satu-satunya file di luar folder modul yang boleh disentuh agen C–G, dan hanya untuk
 * menambah SATU impor + SATU entri modul miliknya. Statis sengaja: Next/Turbopack tidak
 * mendukung glob impor, dan impor eksplisit membuat modul yang hilang gagal saat build.
 */
import type { ModuleConfig } from './nav';

export const MODULES: readonly ModuleConfig[] = [
  // contoh: import { moduleConfig as clients } from '@/modules/clients/module.config';  →  clients,
];
