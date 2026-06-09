import * as React from 'react';

export interface DataRowProps {
  label: string;
  value: React.ReactNode;
}

export function DataRow({ label, value }: DataRowProps) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100 last:border-0 items-center">
      <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="col-span-2 text-sm font-semibold text-gray-900">
        {value !== undefined && value !== null && value !== '' ? (
          value
        ) : (
          <span className="text-gray-400 italic">Not specified</span>
        )}
      </div>
    </div>
  );
}
