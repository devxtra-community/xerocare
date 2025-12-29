"use client"
import { Select, SelectTrigger,SelectValue,SelectContent,SelectItem } from "@/components/ui/select"

type RoleSelectProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function RoleSelect({ value, onChange }: RoleSelectProps){
    return(
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
                <SelectValue placeholder="Select Employee Role"></SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white">
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
            </SelectContent>
        </Select>
    )
}