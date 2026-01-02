"use client";
import React from "react";
import StatCard from "@/components/StatCard";

export default function InventoryKPICards() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
      <StatCard
        title="Total Stock"
        value="12,450"
        subtitle="Combined active items"
      />
      <StatCard
        title="Damaged Products"
        value="145"
        subtitle="Requires attention"
      />
      <StatCard
        title="Total Product Models"
        value="84"
        subtitle="Unique printer models"
      />
      <StatCard
        title="Total Stock Values"
        value="₹ 4.2M"
        subtitle="Inventory valuation"
      />
    </div>
  );
}
