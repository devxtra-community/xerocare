"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RoleSelectProps = {
  value: string;
  onChange: (role: string) => void;
};

export default function RoleSelect({ value, onChange }: RoleSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select role" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="Admin">Admin</SelectItem>
        <SelectItem value="HR">HR</SelectItem>
        <SelectItem value="Employee">Employee</SelectItem>
      </SelectContent>
    </Select>
  );
}
