'use client';

import { ErrorState } from '@/shell/states';
import { buttonClass } from '@/components/ui/styles';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      message="Halaman gagal dimuat. Coba lagi; bila berulang, hubungi admin."
      action={
        <button type="button" onClick={reset} className={buttonClass.primary}>
          Coba lagi
        </button>
      }
    />
  );
}
