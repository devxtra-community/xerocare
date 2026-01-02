'use client';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

export default function RoleSelect() {
  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select Employee Role"></SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="marketing">Marketing</SelectItem>
        <SelectItem value="finance">Finance</SelectItem>
        <SelectItem value="sales">Sales</SelectItem>
      </SelectContent>
    </Select>
  );
}
