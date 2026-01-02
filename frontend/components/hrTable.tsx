"use client";
import { useState, useEffect } from "react";
import { getAllEmployees, Employee } from "@/lib/employee";

const ITEMS_PER_PAGE = 5;

// Helper to format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-GB");
};

export default function HrTable() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await getAllEmployees();
        const data = response.data || [];

        // Map backend data to table format
        const mappedData = data.map((emp: any) => ({
          id: emp.id,
          Fullname: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
          Position: emp.role,
          startDate: emp.createdAt ? formatDate(emp.createdAt) : "N/A",
          salary: emp.salary ? `${emp.salary}` : "N/A",
          avatar: emp.first_name ? emp.first_name[0].toUpperCase() : "U",
        }));

        setEmployees(mappedData);
      } catch (error) {
        console.error("Failed to fetch employees", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const totalPages = Math.ceil(employees.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = employees.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (loading) {
    return <div className="rounded-2xl bg-white p-2 sm:p-3 shadow-sm w-full h-[280px] flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="rounded-2xl bg-white p-2 sm:p-3 shadow-sm w-full h-[280px] flex flex-col">
      {/* TABLE */}
      <div className="flex-1 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left text-[10px] sm:text-xs font-semibold text-blue-900 py-1.5 sm:py-2 px-1 sm:px-2">
                NAME
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-blue-900 py-1.5 sm:py-2 px-1 sm:px-2">
                POSITION
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-blue-900 py-1.5 sm:py-2 px-1 sm:px-2">
                START
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-blue-900 py-1.5 sm:py-2 px-1 sm:px-2">
                SALARY
              </th>
            </tr>
          </thead>

          <tbody>
            {currentData.length > 0 ? (
              currentData.map((item, index) => (
                <tr key={index} className={index % 2 ? "bg-sky-100/60" : ""}>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-gray-300 flex items-center justify-center text-[10px] sm:text-xs font-medium text-gray-700">
                        {item.avatar}
                      </div>
                      <span className="text-gray-900 truncate">
                        {item.Fullname}
                      </span>
                    </div>
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                    {item.Position}
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                    {item.startDate}
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                    {item.salary}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-4 text-xs text-gray-500">No employees found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="mt-2 sm:mt-3 flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs flex-shrink-0">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded-md border px-1.5 sm:px-2 py-0.5 disabled:opacity-40 hover:bg-gray-50 transition"
        >
          &lt;
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .slice(0, 4)
          .map((num) => (
            <button
              key={num}
              onClick={() => setPage(num)}
              className={`px-1.5 sm:px-2 py-0.5 rounded-md transition ${page === num
                  ? "bg-blue-900 text-white"
                  : "border hover:bg-gray-50"
                }`}
            >
              {num}
            </button>
          ))}

        {totalPages > 4 && <span className="px-0.5 sm:px-1">...</span>}

        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="rounded-md border px-1.5 sm:px-2 py-0.5 disabled:opacity-40 hover:bg-gray-50 transition"
        >
          &gt;
        </button>
      </div>
    </div>
  );
}

