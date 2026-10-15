import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

/**
 * eslint-config-next@16 mengekspor flat config native (array of config
 * objects), jadi tidak perlu FlatCompat. Gunakan langsung:
 * - `eslint-config-next/core-web-vitals` → base (react, next, import,
 *   jsx-a11y) + aturan core-web-vitals
 * - `eslint-config-next/typescript`      → typescript-eslint recommended (ts/tsx)
 *
 * Semua entry sudah menyertakan global ignores (.next/**, out/**, build/**,
 * next-env.d.ts).
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    ignores: ['node_modules/**', 'coverage/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  prettier,
];

export default eslintConfig;
