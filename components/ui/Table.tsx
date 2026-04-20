// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Table Component  ·  WCAG 2.2
// 1.3.1: scope on th · caption for context
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';

export interface Column<T> {
  key:       keyof T | string;
  header:    string;
  render?:   (row: T, idx: number) => ReactNode;
  align?:    'left' | 'center' | 'right';
  width?:    string;
}

interface TableProps<T> {
  caption:     string;
  columns:     Column<T>[];
  rows:        T[];
  keyField:    keyof T;
  emptyText?:  string;
  striped?:    boolean;
  className?:  string;
}

export default function Table<T extends Record<string, unknown>>({
  caption, columns, rows, keyField, emptyText = 'No data', striped = true, className = '',
}: TableProps<T>) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-mgray ${className}`}>
      <table className="w-full text-sm" aria-label={caption}>
        {/* WCAG 1.3.1: caption provides context */}
        <caption className="sr-only">{caption}</caption>

        <thead className="bg-lgray">
          <tr>
            {columns.map(col => (
              <th
                key={String(col.key)}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={[
                  'px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide',
                  'border-b border-mgray',
                  col.align === 'right'  ? 'text-right'  :
                  col.align === 'center' ? 'text-center' : 'text-left',
                ].join(' ')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-slate-400"
                aria-live="polite"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={String(row[keyField])}
                className={[
                  'border-b border-mgray last:border-0 transition-colors',
                  striped && idx % 2 === 1 ? 'bg-lgray/50' : 'bg-white',
                  'hover:bg-blue-50/40',
                ].filter(Boolean).join(' ')}
              >
                {columns.map(col => (
                  <td
                    key={String(col.key)}
                    className={[
                      'px-4 py-3 text-slate-700',
                      col.align === 'right'  ? 'text-right'  :
                      col.align === 'center' ? 'text-center' : 'text-left',
                    ].join(' ')}
                  >
                    {col.render
                      ? col.render(row, idx)
                      : String(row[col.key as keyof T] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
