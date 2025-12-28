"use client";
const data = [
  { name: "Alice Johnson", role: "Product Manager", dept: "Marketing", date: "2023-10-01", status: "Active" },
  { name: "Bob Smith", role: "Software Engineer", dept: "Engineering", date: "2023-10-05", status: "Active" },
  { name: "Charlie Brown", role: "HR Specialist", dept: "HR", date: "2023-10-10", status: "Active" },
  { name: "David Wilson", role: "Financial Analyst", dept: "Finance", date: "2023-10-12", status: "Probation" },
  { name: "Eve Davis", role: "UX Designer", dept: "Engineering", date: "2023-10-15", status: "Active" },
];

export default function RecentEmployeesTable() {
  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/50 text-blue-900 border-b border-gray-100">
              <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">NAME</th>
              <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">ROLE</th>
              <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">DEPT</th>
              <th className="text-left font-bold py-4 px-6 uppercase tracking-wider text-[11px]">JOINED</th>
              <th className="text-right font-bold py-4 px-6 uppercase tracking-wider text-[11px]">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((item, i) => (
              <tr key={i} className="hover:bg-blue-50/20 transition-colors">
                <td className="py-4 px-6 font-bold text-gray-900">{item.name}</td>
                <td className="py-4 px-6 text-gray-600">{item.role}</td>
                <td className="py-4 px-6 text-gray-600">{item.dept}</td>
                <td className="py-4 px-6 text-gray-600">{item.date}</td>
                <td className="py-4 px-6 text-right">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
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
