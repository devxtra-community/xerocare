'use client';

const data = [
  {
    product: 'Paracetamol 500mg',
    model: 'Strip of 10',
    quantity: 150,
    branch: 'Branch A',
    amount: '₹750',
    date: '2026-01-01',
  },
  {
    product: 'Amoxicillin 250mg',
    model: 'Capsule',
    quantity: 80,
    branch: 'Branch B',
    amount: '₹1,200',
    date: '2026-01-01',
  },
  {
    product: 'Hand Sanitizer',
    model: '500ml Bottle',
    quantity: 45,
    branch: 'Branch A',
    amount: '₹3,150',
    date: '2026-01-02',
  },
  {
    product: 'Digital Thermometer',
    model: 'Infrared',
    quantity: 12,
    branch: 'Branch C',
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
                Branch
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
                <td className="py-3 px-2 text-[10px] sm:text-sm">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                    {row.branch}
                  </span>
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
