'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell } from 'recharts';

import { getAllProducts, Product } from '@/lib/product';

const COLORS = ['#FF6B35', '#004E89', '#00A8E8', '#F7B500', '#E040FB', '#2E7D32'];

/**
 * Pie chart component displaying product distribution by brand.
 * Visualizes the proportion of products associated with different brands.
 */
export default function CategoryPieChart({ selectedYear }: { selectedYear: number | 'all' }) {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchBrandData = async () => {
      try {
        const products = await getAllProducts();
        let productList = products || [];

        // Filter by year if not 'all'
        if (selectedYear !== 'all') {
          productList = productList.filter((p: Product) => {
            const date = new Date(p.created_at);
            return date.getFullYear() === selectedYear;
          });
        }

        const brandCounts: Record<string, number> = {};
        productList.forEach((p: Product) => {
          const brand = p.brand || 'Unknown';
          brandCounts[brand] = (brandCounts[brand] || 0) + 1;
        });

        const total = Object.values(brandCounts).reduce((a, b) => a + b, 0);

        const chartData = Object.keys(brandCounts).map((brand, index) => ({
          name: brand,
          value: total > 0 ? Math.round((brandCounts[brand] / total) * 100) : 0, // Percentage
          color: COLORS[index % COLORS.length],
        }));

        setData(chartData);
      } catch (error) {
        console.error('Failed to fetch product brands', error);
      }
    };
    fetchBrandData();
  }, [selectedYear]);

  return (
    <div className="rounded-2xl bg-card p-2 sm:p-3 shadow-sm w-full h-[280px] flex flex-col">
      {!isClient || data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading distribution...</p>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="relative w-[120px] h-[120px] mx-auto mb-4 flex-shrink-0">
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
          </div>

          <div className="w-full space-y-1.5 overflow-y-auto max-h-[100px] flex-1">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-foreground truncate max-w-[100px]">
                    {item.name}
                  </span>
                </div>
                <span className="font-semibold text-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
