"use client";

const data = [
  { dept: "Marketing", headcount: 80, performance: "92%", status: "On Track" },
  { dept: "Finance", headcount: 45, performance: "88%", status: "On Track" },
  { dept: "HR", headcount: 25, performance: "95%", status: "Exceeding" },
  { dept: "Engineering", headcount: 120, performance: "85%", status: "Needs Review" },
  { dept: "Sales", headcount: 30, performance: "90%", status: "On Track" },
];

export default function DepartmentSummaryTable() {
  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 h-[300px] flex flex-col overflow-hidden">
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] p-5 pb-4">Department Summary</h4>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/50 text-blue-900 border-b border-gray-100">
              <th className="text-left font-bold py-3 px-4 uppercase tracking-wider text-[11px]">DEPARTMENT</th>
              <th className="text-center font-bold py-3 px-4 uppercase tracking-wider text-[11px]">HEADCOUNT</th>
              <th className="text-center font-bold py-3 px-4 uppercase tracking-wider text-[11px]">PERF</th>
              <th className="text-right font-bold py-3 px-4 uppercase tracking-wider text-[11px]">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((item, i) => (
              <tr key={i} className="hover:bg-blue-50/20 transition-colors">
                <td className="py-3 px-4 font-bold text-gray-900">{item.dept}</td>
                <td className="py-3 px-4 text-center text-gray-600">{item.headcount}</td>
                <td className="py-3 px-4 text-center text-gray-600">{item.performance}</td>
                <td className="py-3 px-4 text-right">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    item.status === 'Exceeding' ? 'bg-green-100 text-green-700' : 
                    item.status === 'On Track' ? 'bg-blue-100 text-blue-700' : 
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
