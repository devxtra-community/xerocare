"use client"

import { useState } from "react"

const humanResourcedatas = [
  { Fullname: "Parviz Aslanov", Position: "UI Designer", startDate: "20.11.2023", salary: "1700 AZN", avatar: "P" },
  { Fullname: "Seving Aslanova", Position: "UX Designer", startDate: "19.02.2023", salary: "1200 AZN", avatar: "S" },
  { Fullname: "Ceyhun Aslanov", Position: "React Developer", startDate: "18.05.2004", salary: "3009 AZN", avatar: "C" },
  { Fullname: "Ayla Mammadova", Position: "UX Researcher Intern", startDate: "18.07.2004", salary: "400 AZN", avatar: "A" },
  { Fullname: "Orxan Hüseyinov", Position: "Accountant", startDate: "17.09.2022", salary: "2000 AZN", avatar: "O" },
  { Fullname: "Parviz Aslanov", Position: "UI Designer", startDate: "20.11.2023", salary: "1700 AZN", avatar: "P" },
  { Fullname: "Seving Aslanova", Position: "UX Designer", startDate: "19.02.2023", salary: "1200 AZN", avatar: "S" },
  { Fullname: "Ceyhun Aslanov", Position: "React Developer", startDate: "18.05.2004", salary: "3009 AZN", avatar: "C" },
  { Fullname: "Ayla Mammadova", Position: "UX Researcher Intern", startDate: "18.07.2004", salary: "400 AZN", avatar: "A" },
  { Fullname: "Orxan Hüseyinov", Position: "Accountant", startDate: "17.09.2022", salary: "2000 AZN", avatar: "O" },
]

const ITEMS_PER_PAGE = 5

export default function HrTable() {
  const [page, setPage] = useState(1)

  const totalPages = Math.ceil(humanResourcedatas.length / ITEMS_PER_PAGE)
  const startIndex = (page - 1) * ITEMS_PER_PAGE
  const currentData = humanResourcedatas.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  )

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm w-full flex flex-col">
      {/* TABLE */}
      <div className="w-full overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left text-sm font-semibold text-blue-900 py-3">FULL NAME</th>
              <th className="text-left text-sm font-semibold text-blue-900 py-3">POSITION</th>
              <th className="text-left text-sm font-semibold text-blue-900 py-3">START DATE</th>
              <th className="text-left text-sm font-semibold text-blue-900 py-3">SALARY</th>
            </tr>
          </thead>

          <tbody>
            {currentData.map((item, index) => (
              <tr key={index} className={index % 2 ? "bg-sky-100/60" : ""}>
                <td className="py-3 px-2 text-sm font-medium">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-700">
                      {item.avatar}
                    </div>
                    <span className="text-gray-900">{item.Fullname}</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-sm text-gray-700">{item.Position}</td>
                <td className="py-3 px-2 text-sm text-gray-700">{item.startDate}</td>
                <td className="py-3 px-2 text-sm text-gray-700">{item.salary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="mt-4 flex items-center justify-center gap-2 text-sm">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded-md border px-3 py-1 disabled:opacity-40 hover:bg-gray-50 transition"
        >
          &lt;
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 4).map(num => (
          <button
            key={num}
            onClick={() => setPage(num)}
            className={`px-3 py-1 rounded-md transition ${
              page === num ? "bg-blue-900 text-white" : "border hover:bg-gray-50"
            }`}
          >
            {num}
          </button>
        ))}

        {totalPages > 4 && <span className="px-2">...</span>}

        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="rounded-md border px-3 py-1 disabled:opacity-40 hover:bg-gray-50 transition"
        >
          &gt;
        </button>
      </div>
    </div>
  )
}
