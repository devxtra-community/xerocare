"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "../ui/switch";
import { Checkbox } from "../ui/checkbox";
import { chartOfAccounts } from "@/lib/finance";


type Account = {
  id?: string;
  code: string;
  name: string;
  type: string;

  isGroup: boolean;
  parentId?: string | null;

  status: "Active" | "Inactive";
};


export default function AddAccountDialog({
  open,
  onClose,
  mode="create",
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  mode?:"create"|"edit";
  initialData?:Account|null;
}) {
  
  const emptyForm:Account = {
    code: "",
    name: "",
    type: "Asset",
    status: "Active",
    isGroup:false,
    parentId:null,
  };
  
  const [form, setForm] = useState<Account>(emptyForm);

  
  // prefill form on edit
  useEffect(()=>{
    if(mode==="edit"&& initialData){
      setForm(initialData);
    }
    if(mode==="create"){
      setForm(emptyForm)
    }
  },[mode,initialData])


  const handleSubmit = () => {
    if(mode ==="create"){
    console.log("CREATE Payload:", form);
    }
    else{
      console.log("UPDATE Payload:", form);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
           {mode==="create"?" Add Account":"Edit Account"}
            </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Account Code"
            value={form.code}
            disabled={mode==="edit"}
            onChange={(e) =>
              setForm({ ...form, code: e.target.value })
            }
          />

          <Input
            placeholder="Account Name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <Select
            value={form.type}
            onValueChange={(value) =>
              setForm({ ...form, type: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Account Type" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="Asset">Asset</SelectItem>
              <SelectItem value="Liability">Liability</SelectItem>
              <SelectItem value="Income">Income</SelectItem>
              <SelectItem value="Expense">Expense</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-3">
  <Checkbox
    checked={form.isGroup}
    onCheckedChange={(checked) =>
      setForm({ ...form, isGroup: Boolean(checked), parentId: "" })
    }
  />
  <label className="text-sm font-medium">
    This is a group (parent) account
  </label>
  {!form.isGroup && (
  <Select
    value={form.parentId??""}
    onValueChange={(value) =>
      setForm({ ...form, parentId: value })
    }
  >
    <SelectTrigger>
      <SelectValue placeholder="Select Parent Account" />
    </SelectTrigger>

    <SelectContent>
      {/** Only show GROUP accounts as parents */}
      {chartOfAccounts
        .filter((acc) => acc.isGroup)
        .map((acc) => (
          <SelectItem key={acc.id} value={acc.id}>
            {acc.code} — {acc.name}
          </SelectItem>
        ))}
    </SelectContent>
  </Select>
)}

</div>


          {mode ==="edit" && (
             <div className="flex items-center justify-between rounded-md border p-3">
    <div>
      <p className="text-sm font-medium">Account Status</p>
      {/* <p className="text-xs text-muted-foreground">
        Disable this account to prevent future postings
      </p> */}
    </div>

    <Switch
      checked={form.status === "Active"}
      onCheckedChange={(checked) =>
        setForm({
          ...form,
          status: checked ? "Active" : "Inactive",
        })
      }
    />
  </div>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {mode==="create"?"Save":"Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
