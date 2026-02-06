'use client';

import { useState } from 'react';
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

const ITEMS_PER_PAGE = 5;

export default function SuspendedHrTable() {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(humanResourcedatas.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = humanResourcedatas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

      {/* Pagination */}
      <div className="mt-6 flex items-center gap-4 text-sm">
        <button
          onClick={() => setPage((p) => p - 1)}
          disabled={page === 1}
          className="rounded-md border px-4 py-2 disabled:opacity-40"
        >
          Previous
        </button>

        <span className="text-muted-foreground">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page === totalPages}
          className="rounded-md border px-4 py-2 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
