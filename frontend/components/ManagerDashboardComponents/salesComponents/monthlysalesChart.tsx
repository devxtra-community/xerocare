'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';

const data = [
  { month: 'Jan', BranchA: 12000, BranchB: 8000, BranchC: 5000 },
  { month: 'Feb', BranchA: 18000, BranchB: 12000, BranchC: 7000 },
  { month: 'Mar', BranchA: 15000, BranchB: 15000, BranchC: 9000 },
  { month: 'Apr', BranchA: 22000, BranchB: 10000, BranchC: 11000 },
  { month: 'May', BranchA: 26000, BranchB: 14000, BranchC: 13000 },
  { month: 'Jun', BranchA: 30000, BranchB: 18000, BranchC: 15000 },
];

export default function MonthlySalesBarChart() {
  return (
    <div className="bg-white rounded-xl p-3 sm:p-4">
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f9ff" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#1e3a8a', fontWeight: 500 }}
              axisLine={{ stroke: '#e0f2fe' }}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#1e3a8a', fontWeight: 500 }} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `₹${value/1000}k`}
            />
            <Tooltip 
              contentStyle={{ 
                fontSize: 12, 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                color: '#1e3a8a'
              }} 
              labelStyle={{ color: '#1e3a8a', fontWeight: 'bold', marginBottom: '4px' }}
              cursor={{ fill: '#f8fafc' }}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', paddingBottom: '20px' }}
            />
            <Bar dataKey="BranchA" name="Branch A" fill="#0D47A1" radius={[4, 4, 0, 0]} stackId="a" />
            <Bar dataKey="BranchB" name="Branch B" fill="#1976D2" radius={[4, 4, 0, 0]} stackId="a" />
            <Bar dataKey="BranchC" name="Branch C" fill="#42A5F5" radius={[4, 4, 0, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
