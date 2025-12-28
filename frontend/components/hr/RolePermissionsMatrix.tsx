"use client";
import { ShieldCheck, Check, X, ShieldAlert } from "lucide-react";

const modules = ["Inventory", "Sales Records", "Employee Data", "Payroll", "Invoices", "Reports"];
const roles = ["Admin", "Manager", "Supervisor", "Technician", "Accountant"];

const data = {
  Admin: [true, true, true, true, true, true],
  Manager: [true, true, true, false, true, true],
  Supervisor: [true, true, false, false, false, true],
  Technician: [true, false, false, false, false, false],
  Accountant: [false, true, false, true, true, true],
};

export default function RolePermissionsMatrix() {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-50 overflow-hidden">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-blue-50/30">
        <div>
           <h4 className="text-lg font-black text-blue-900">Permissions Matrix</h4>
           <p className="text-xs text-gray-400 font-medium">Define module access levels across organizational roles.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-[10px] font-bold text-gray-500 uppercase">Grand Access</span>
           </div>
           <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <span className="text-[10px] font-bold text-gray-500 uppercase">Restricted</span>
           </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/20">
              <th className="text-left font-bold py-5 px-8 uppercase tracking-widest text-[11px] text-blue-900/50">Module / App</th>
              {roles.map((role) => (
                <th key={role} className="text-center font-bold py-5 px-6 uppercase tracking-wider text-[11px] text-blue-900 border-l border-gray-50">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {modules.map((module, i) => (
              <tr key={module} className="hover:bg-blue-50/10 transition-colors group">
                <td className="py-5 px-8">
                   <div className="flex items-center gap-3">
                      <ShieldCheck size={16} className="text-blue-500" />
                      <span className="font-bold text-gray-800">{module}</span>
                   </div>
                </td>
                {roles.map((role) => (
                  <td key={role} className="py-5 px-6 text-center border-l border-gray-50">
                     <div className="flex justify-center">
                        {(data as any)[role][i] ? (
                          <div className="h-7 w-7 rounded-full bg-green-50 text-green-600 flex items-center justify-center ring-4 ring-green-50/50">
                             <Check size={14} />
                          </div>
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center opacity-40">
                             <X size={14} />
                          </div>
                        )}
                     </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
