"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ManualAttendanceDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="rounded-lg bg-blue-900 hover:bg-blue-800 text-white px-6 h-10 font-medium">
                   Mark Attendance
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px] bg-white rounded-3xl border-none shadow-2xl">
                <DialogHeader className="space-y-3 pb-4">
                    <DialogTitle className="text-2xl font-bold text-blue-900">Manual Attendance Entry</DialogTitle>
                    <p className="text-sm text-gray-500">Admin/HR only - Mark attendance manually</p>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="employee" className="text-sm font-bold text-gray-700">Employee</Label>
                        <Select>
                            <SelectTrigger className="h-11 rounded-xl border-gray-200">
                                <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="emp001">Nathan Drake - EMP001</SelectItem>
                                <SelectItem value="emp002">Elena Fisher - EMP002</SelectItem>
                                <SelectItem value="emp003">Victor Sullivan - EMP003</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="date" className="text-sm font-bold text-gray-700">Date</Label>
                        <Input 
                            id="date" 
                            type="date" 
                            className="h-11 rounded-xl border-gray-200"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="checkIn" className="text-sm font-bold text-gray-700">Check In</Label>
                            <Input 
                                id="checkIn" 
                                type="time" 
                                className="h-11 rounded-xl border-gray-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="checkOut" className="text-sm font-bold text-gray-700">Check Out</Label>
                            <Input 
                                id="checkOut" 
                                type="time" 
                                className="h-11 rounded-xl border-gray-200"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status" className="text-sm font-bold text-gray-700">Status</Label>
                        <Select>
                            <SelectTrigger className="h-11 rounded-xl border-gray-200">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="leave">On Leave</SelectItem>
                                <SelectItem value="half-day">Half Day</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes" className="text-sm font-bold text-gray-700">Notes (Optional)</Label>
                        <Input 
                            id="notes" 
                            placeholder="Add any notes..." 
                            className="h-11 rounded-xl border-gray-200"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" className="rounded-xl px-6 h-11 border-gray-200">
                        Cancel
                    </Button>
                    <Button className="rounded-xl bg-blue-900 hover:bg-blue-800 text-white px-6 h-11">
                        Save Entry
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
