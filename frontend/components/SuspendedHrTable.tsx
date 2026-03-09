'use client';

import { useEffect } from 'react';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

const humanResourcedatas = [
  {
    Fullname: 'Riyas',
    Possition: 'Sales Staff',
    startDate: '20/12/2024',
    salary: '75,000',
    expair: '20/12/2027',
  },
  {
    Fullname: 'Nadhil',
    Possition: 'Sales Staff',
    startDate: '20/12/2024',
    salary: '74,000',
    expair: '20/12/2027',
  },
  {
    Fullname: 'Chechu',
    Possition: 'Sales Staff',
    startDate: '20/12/2024',
    salary: '71,000',
    expair: '20/12/2027',
  },
  {
    Fullname: 'Shanu',
    Possition: 'Sales Staff',
    startDate: '20/12/2024',
    salary: '35,000',
    expair: '20/12/2027',
  },
  {
    Fullname: 'Sameer',
    Possition: 'Sales Staff',
    startDate: '20/12/2024',
    salary: '34,000',
    expair: '20/12/2027',
  },
  {
    Fullname: 'shrijit',
    Possition: 'Sales Staff',
    startDate: '20/12/2024',
    salary: '55,000',
    expair: '20/12/2027',
  },
  {
    Fullname: 'messi',
    Possition: 'Sales Staff',
    startDate: '20/12/2024',
    salary: '45,000',
    expair: '20/12/2027',
  },
  {
    Fullname: 'cristiano',
    Possition: 'Sales Staff',
    startDate: '20/12/2024',
    salary: '45,000',
    expair: '20/12/2027',
  },
  {
    Fullname: 'Drogba',
    Possition: 'Sales Staff',
    startDate: '20/12/2024',
    salary: '35,000',
    expair: '20/12/2027',
  },
  {
    Fullname: 'Rajanmon',
    Possition: 'Sales Staff',
    startDate: '20/12/2024',
    salary: '55,000',
    expair: '20/12/2027',
  },
];

/**
 * Table component for displaying suspended HR staff.
 * Includes pagination and styled table rows.
 */
export default function SuspendedHrTable() {
  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(5);

  useEffect(() => {
    setTotal(humanResourcedatas.length);
  }, [setTotal]);

  const currentData = humanResourcedatas.slice((page - 1) * limit, page * limit);

  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-none">
            <TableHead className="text-primary font-semibold">FULL NAME</TableHead>
            <TableHead className="text-primary font-semibold">POSITION</TableHead>
            <TableHead className="text-primary font-semibold">START DATE</TableHead>
            <TableHead className="text-primary font-semibold">SALARY</TableHead>
            <TableHead className="text-primary font-semibold">CONTRACT END</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="border-separate border-spacing-y-3 text-foreground">
          {currentData.map((item, index) => (
            <TableRow
              key={index}
              className={`border-none rounded-xl ${index % 2 === 1 ? 'bg-blue-50/20' : 'bg-card'}`}
            >
              <TableCell className="font-medium rounded-l-xl">{item.Fullname}</TableCell>
              <TableCell>{item.Possition}</TableCell>
              <TableCell>{item.startDate}</TableCell>
              <TableCell>{item.salary}</TableCell>
              <TableCell className="rounded-r-xl">{item.expair}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
