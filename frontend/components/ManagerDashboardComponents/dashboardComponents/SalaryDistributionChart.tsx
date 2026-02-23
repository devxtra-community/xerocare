'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getHRStats } from '@/lib/employee';

const COLORS = ['#003F7D', '#0284C7', '#0891b2', '#7dd3fc', '#94a3b8', '#CBD5E1'];

export default function SalaryDistributionChart() {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    setIsClient(true);
    const fetchData = async () => {
      try {
        const res = await getHRStats();
        if (res.success && res.data.bySalary) {
          const rawSalary = res.data.bySalary;
          const chartData = [
            { name: 'Branch Manager', value: rawSalary.BRANCH_MANAGER || 0 },
            { name: 'Employee Manager', value: rawSalary.EMPLOYEE_MANAGER || 0 },
            { name: 'Sales Staff', value: rawSalary.SALES_STAFF || 0 },
            { name: 'Rent & Lease Staff', value: rawSalary.RENT_LEASE_STAFF || 0 },
            { name: 'Finance', value: rawSalary.FINANCE || 0 },
            { name: 'Other', value: rawSalary.OTHER || 0 },
          ].filter((item) => item.value > 0);

          setData(chartData);
        }
      } catch (error) {
        console.error('Failed to fetch salary distribution data:', error);
      }
    };
    fetchData();
  }, []);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (!isClient) return <div className="h-[320px] w-full bg-white rounded-2xl animate-pulse" />;

  return (
    <div className="rounded-2xl bg-white h-[320px] w-full shadow-sm border border-blue-50 flex flex-col p-4">
      <div className="pb-2">
        <h4 className="text-sm font-semibold text-gray-800">Salary Payroll Distribution</h4>
        <p className="text-[10px] text-gray-500">Total: QAR {(total / 1000).toFixed(1)}k</p>
      </div>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              stroke="white"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0];
                  const percentage =
                    total > 0 ? (((item.value as number) / total) * 100).toFixed(1) : 0;
                  return (
                    <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-50">
                      <p className="text-xs font-bold text-gray-700">{item.name}</p>
                      <p className="text-xs text-primary font-medium">
                        QAR {((item.value as number) / 1000).toFixed(1)}k ({percentage}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                fontSize: '10px',
                fontWeight: 500,
                color: '#64748b',
                paddingTop: '10px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
