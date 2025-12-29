"use client";

const data = [
  {
    product: "MacBook",
    model: "Pro",
    quantity: 12,
    price: "2999 AZN",
    month: "September",
    year: 2024,
  },
  {
    product: "iPhone",
    model: "15 Pro",
    quantity: 25,
    price: "3999 AZN",
    month: "September",
    year: 2024,
  },
  {
    product: "iPhone",
    model: "15",
    quantity: 18,
    price: "1999 AZN",
    month: "August",
    year: 2024,
  },
  {
    product: "MacBook",
    model: "Air",
    quantity: 9,
    price: "1499 AZN",
    month: "August",
    year: 2024,
  },
];

export default function SalesSummaryTable() {
  return (
    <div className="rounded-2xl bg-white p-2 sm:p-3 shadow-sm w-full h-full flex flex-col">
      
      <div className="flex-1 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                PRODUCT
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                MODEL
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                QTY
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                PRICE
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                MONTH
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                YEAR
              </th>
            </tr>
          </thead>

          <tbody>
            {data.map((row, index) => (
              <tr
                key={index}
                className={index % 2 === 1 ? "bg-sky-100/60" : ""}
              >
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium text-gray-900">
                  {row.product}
                </td>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {row.model}
                </td>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {row.quantity}
                </td>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {row.price}
                </td>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {row.month}
                </td>
                <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                  {row.year}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
