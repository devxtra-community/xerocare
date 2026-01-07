'use client';

const data = [
  {
    product: 'HP LaserJet Pro',
    model: 'M404dn',
    quantity: 15,
    amount: '₹45,000',
    date: '2026-01-01',
  },
  {
    product: 'Canon PIXMA',
    model: 'G3010',
    quantity: 8,
    amount: '₹12,800',
    date: '2026-01-01',
  },
  {
    product: 'Epson EcoTank',
    model: 'L3210',
    quantity: 12,
    amount: '₹31,500',
    date: '2026-01-02',
  },
  {
    product: 'Brother HL-L2350DW',
    model: 'Monochrome',
    quantity: 5,
    amount: '₹14,400',
    date: '2026-01-03',
  },
];

export default function SalesSummaryTable() {
  return (
    <div className="rounded-2xl bg-white p-2 sm:p-4 shadow-sm w-full h-full flex flex-col border border-blue-50">
      <div className="flex-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-blue-50">
              <th className="text-left text-[10px] sm:text-xs font-bold text-blue-900/60 uppercase tracking-wider py-3 px-2">
                Product
              </th>
              <th className="text-left text-[10px] sm:text-xs font-bold text-blue-900/60 uppercase tracking-wider py-3 px-2">
                Model/Type
              </th>
              <th className="text-left text-[10px] sm:text-xs font-bold text-blue-900/60 uppercase tracking-wider py-3 px-2">
                Qty
              </th>
              <th className="text-left text-[10px] sm:text-xs font-bold text-blue-900/60 uppercase tracking-wider py-3 px-2">
                Amount
              </th>
              <th className="text-left text-[10px] sm:text-xs font-bold text-blue-900/60 uppercase tracking-wider py-3 px-2">
                Date
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-blue-50/50">
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                <td className="py-3 px-2 text-[10px] sm:text-sm font-semibold text-blue-900">
                  {row.product}
                </td>
                <td className="py-3 px-2 text-[10px] sm:text-sm text-blue-800/80">
                  {row.model}
                </td>
                <td className="py-3 px-2 text-[10px] sm:text-sm text-blue-800/80">
                  {row.quantity}
                </td>
                <td className="py-3 px-2 text-[10px] sm:text-sm font-bold text-blue-900">
                  {row.amount}
                </td>
                <td className="py-3 px-2 text-[10px] sm:text-sm text-blue-800/80">
                  {row.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
