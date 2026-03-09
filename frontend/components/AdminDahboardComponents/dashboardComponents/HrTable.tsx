import { useState, useEffect } from 'react';
import { getAllEmployees, Employee } from '@/lib/employee';
import { toast } from 'sonner';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';

interface EmployeeDisplay {
  Fullname: string;
  Position: string;
  startDate: string;
  salary: string;
  avatar: string;
}

/**
 * Dashboard widget displaying recent employee additions.
 * Shows a paginated list of employees with their position, start date, and salary.
 */
export default function HrTable({ selectedYear }: { selectedYear: number | 'all' }) {
  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(5);
  const [employees, setEmployees] = useState<EmployeeDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await getAllEmployees();
        // API returns { success: true, data: { employees: [], pagination: {} } }
        let employeeList = res.data?.employees || [];

        // Filter by year if not 'all'
        if (selectedYear !== 'all') {
          employeeList = employeeList.filter((emp: Employee) => {
            const date = new Date(emp.createdAt);
            return date.getFullYear() === selectedYear;
          });
        }

        const mappedData = employeeList.map((emp: Employee) => {
          const firstName = emp.first_name || '';
          const lastName = emp.last_name || '';
          const fullName = (firstName + ' ' + lastName).trim() || emp.email || 'Unknown';

          let formattedDate = 'N/A';
          if (emp.createdAt) {
            try {
              formattedDate = new Date(emp.createdAt).toLocaleDateString('en-GB'); // DD/MM/YYYY
            } catch (e) {
              console.error(e);
            }
          }

          return {
            Fullname: fullName,
            Position: emp.role || 'Employee',
            startDate: formattedDate,
            salary: emp.salary ? `${emp.salary}` : 'N/A',
            avatar: fullName.charAt(0).toUpperCase(),
          };
        });
        setEmployees(mappedData);
      } catch (error) {
        console.error('Failed to fetch employees', error);
        toast.error('Failed to load employee data');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [selectedYear]);

  useEffect(() => {
    setTotal(employees.length);
  }, [employees.length, setTotal]);

  const currentData = employees.slice((page - 1) * limit, page * limit);

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-2 sm:p-3 shadow-sm w-full h-[280px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-2 sm:p-3 shadow-sm w-full h-[280px] flex flex-col">
      {/* TABLE */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                NAME
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                POSITION
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                START
              </th>
              <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                SALARY
              </th>
            </tr>
          </thead>

          <tbody>
            {currentData.length > 0 ? (
              currentData.map((item, index) => (
                <tr key={index} className={index % 2 !== 0 ? 'bg-blue-50/20' : 'bg-card'}>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-gray-300 flex items-center justify-center text-[10px] sm:text-xs font-medium text-gray-700">
                        {item.avatar}
                      </div>
                      <span className="text-foreground truncate">{item.Fullname}</span>
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
                <td colSpan={4} className="text-center py-10 text-xs text-muted-foreground">
                  No employee records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-auto pt-2">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
