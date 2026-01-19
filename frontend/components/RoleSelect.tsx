'use client';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

interface Props {
  value?: string;
  onChange?: (value: string) => void;
}

export default function RoleSelect({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="rounded-xl bg-gray-50 border-none">
        <SelectValue placeholder="Select Employee Role"></SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="HR">HR</SelectItem>
        <SelectItem value="EMPLOYEE">Employee</SelectItem>
        <SelectItem value="FINANCE">Finance</SelectItem>
        <SelectItem value="MANAGER">Manager</SelectItem>
      </SelectContent>
    </Select>
  );
}
