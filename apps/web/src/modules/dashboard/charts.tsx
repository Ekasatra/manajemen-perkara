'use client';

import React from 'react';

export function CasesStatusChart({
  byStatus,
}: {
  byStatus: { status: string; count: number }[];
}) {
  const total = byStatus.reduce((sum, item) => sum + item.count, 0);

  const colors: Record<string, string> = {
    Aktif: '#1A2E44', // Navy
    Selesai: '#10B981', // Green
    Tutup: '#64748B', // Slate
    Banding: '#B38B4D', // Gold
    Kasasi: '#F59E0B', // Amber
    PK: '#8B5CF6', // Purple
  };

  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        Belum ada data status perkara
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Visual Bar Breakdown */}
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-100">
        {byStatus.map((item) => {
          if (item.count === 0) return null;
          const pct = (item.count / total) * 100;
          const bg = colors[item.status] || '#94A3B8';
          return (
            <div
              key={item.status}
              style={{ width: `${pct}%`, backgroundColor: bg }}
              className="h-full transition-all duration-300"
              title={`${item.status}: ${item.count} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      {/* Legend & Details */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {byStatus.map((item) => {
          const bg = colors[item.status] || '#94A3B8';
          const pct = total > 0 ? ((item.count / total) * 100).toFixed(0) : '0';
          return (
            <div
              key={item.status}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 p-2 text-xs"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: bg }}
                />
                <span className="font-medium text-gray-700">{item.status}</span>
              </div>
              <span className="font-bold text-gray-900">
                {item.count}{' '}
                <span className="font-normal text-gray-400">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SuratTrendChart({
  trend6Bulan,
}: {
  trend6Bulan: { month: string; suratMasuk: number; suratKeluar: number }[];
}) {
  const maxVal = Math.max(
    1,
    ...trend6Bulan.map((t) => Math.max(t.suratMasuk, t.suratKeluar)),
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Legend */}
      <div className="flex items-center justify-end gap-4 text-xs font-medium">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-navy-700" />
          <span className="text-gray-600">Surat Masuk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-[#B38B4D]" />
          <span className="text-gray-600">Surat Keluar</span>
        </div>
      </div>

      {/* Bar Chart Display */}
      <div className="flex h-48 items-end gap-3 border-b border-gray-200 pb-2 pt-4">
        {trend6Bulan.map((item) => {
          const smHeight = (item.suratMasuk / maxVal) * 140;
          const skHeight = (item.suratKeluar / maxVal) * 140;

          return (
            <div
              key={item.month}
              className="group flex flex-1 flex-col items-center gap-1"
            >
              <div className="flex h-36 w-full items-end justify-center gap-1">
                {/* Surat Masuk Bar */}
                <div
                  style={{ height: `${Math.max(4, smHeight)}px` }}
                  className="w-full max-w-[16px] rounded-t bg-navy-700 transition-all duration-300 group-hover:bg-navy-600"
                  title={`Surat Masuk: ${item.suratMasuk}`}
                />
                {/* Surat Keluar Bar */}
                <div
                  style={{ height: `${Math.max(4, skHeight)}px` }}
                  className="w-full max-w-[16px] rounded-t bg-[#B38B4D] transition-all duration-300 group-hover:bg-[#97733B]"
                  title={`Surat Keluar: ${item.suratKeluar}`}
                />
              </div>
              <span className="text-[11px] text-gray-500">{item.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

