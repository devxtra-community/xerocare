'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell } from 'recharts';

import { getAllProducts, Product } from '@/lib/product';

const COLORS = ['#FF6B35', '#004E89', '#00A8E8', '#F7B500', '#E040FB', '#2E7D32'];

export default function CategoryPieChart() {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchBrandData = async () => {
      try {
        const products = await getAllProducts();

        const brandCounts: Record<string, number> = {};
        products.forEach((p: Product) => {
          const brand = p.brand || 'Unknown';
          brandCounts[brand] = (brandCounts[brand] || 0) + 1;
        });

        const total = Object.values(brandCounts).reduce((a, b) => a + b, 0);

        const chartData = Object.keys(brandCounts).map((brand, index) => ({
          name: brand,
          value: Math.round((brandCounts[brand] / total) * 100), // Percentage
          color: COLORS[index % COLORS.length],
        }));

        setData(chartData);
      } catch (error) {
        console.error('Failed to fetch product brands', error);
      }
    };
    fetchBrandData();
  }, []);

  return (
    <div className="rounded-2xl bg-white shadow-sm w-full p-4 h-[260px] flex flex-col">
      <h3 className="text-base font-semibold text-primary mb-3">Brands</h3>

      <div className="relative w-[120px] h-[120px] mx-auto mb-4">
        {isClient && data.length > 0 ? (
          <PieChart width={120} height={120}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx={60}
              cy={60}
              innerRadius={35}
              outerRadius={56}
              startAngle={90}
              endAngle={-270}
              paddingAngle={3}
              stroke="#ffffff"
              strokeWidth={3}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        ) : (
          <div className="flex items-center justify-center w-full h-full text-xs text-gray-400">
            {isClient ? 'No Data' : 'Loading...'}
          </div>
        )}
      </div>

      <div className="w-full space-y-2 overflow-y-auto max-h-[80px]">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium text-gray-900 truncate max-w-[100px]">{item.name}</span>
            </div>
            <span className="font-semibold text-gray-900">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
