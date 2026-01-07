"use client";

import { useState } from "react";
import PageHeader from "@/components/Finance/pageHearder";
import StatusBadge from "@/components/Finance/statusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { chartOfAccounts } from "@/lib/finance";
import AddAccountDialog from "@/components/Finance/AddAccountDialog";

export default function ChartOfAccountsPage() {
  const [open, setOpen] = useState(false);
  const [mode,setMode] = useState<"create"|"edit">("create")
  const [selectedAccount, setSelectedAccount] =useState<any>(null);

  const handleAdd=()=>{
    setMode("create");
    setSelectedAccount(null);
    setOpen(true);
  }

  const handleEdit=(account:any)=>{
    setMode("edit");
    setSelectedAccount(account);
    setOpen(true)
  }
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Chart of Accounts"
        description="Manage all financial accounts used in accounting entries"
        action={<Button onClick={handleAdd}>Add Account</Button>}
      />

      <div className="bg-card border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {chartOfAccounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">
                  {account.code}
                </TableCell>
                <TableCell>{account.name}</TableCell>
                <TableCell>{account.type}</TableCell>
                <TableCell>
  {account.isGroup ? "Yes" : "No"}
</TableCell>

                <TableCell>
                  <StatusBadge status={account.status} />
                </TableCell>
                <TableCell>
                    <Button variant={"ghost"} size="sm" onClick={()=>handleEdit(account)}>
                        Edit
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddAccountDialog open={open} onClose={() => setOpen(false)} mode={mode} initialData={selectedAccount} />
    </div>
  );
}
