"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus } from "lucide-react"

export default function EmployeeDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="rounded-lg bg-blue-900 hover:bg-blue-800 text-white px-6 h-10 font-medium">
                   Add Employee
                </Button>
            </DialogTrigger>	

            <DialogOverlay className="fixed inset-0 z-50 bg-blue-950/10 backdrop-blur-[2px]" />

            <DialogContent className="z-50 sm:max-w-[500px] rounded-3xl bg-white p-0 overflow-hidden border border-gray-100 shadow-2xl">
                <DialogHeader className="bg-white border-b border-gray-50 p-8">
                    <DialogTitle className="text-2xl font-black text-blue-900">New Employee</DialogTitle>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mt-1">Personnel Registration</p>
                </DialogHeader>

                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label htmlFor="fullname">Full Name</Label>
                           <Input id="fullname" placeholder="e.g. John Doe" className="rounded-lg border-gray-100 bg-gray-50 focus-visible:ring-blue-900" />
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="empid">Employee ID</Label>
                           <Input id="empid" placeholder="e.g. EMP123" className="rounded-lg border-gray-100 bg-gray-50 focus-visible:ring-blue-900" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label>Department</Label>
                           <Select>
                                <SelectTrigger className="rounded-lg border-gray-100 bg-gray-50">
                                    <SelectValue placeholder="Select Dept" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="eng">Engineering</SelectItem>
                                    <SelectItem value="mkt">Marketing</SelectItem>
                                    <SelectItem value="hr">HR</SelectItem>
                                    <SelectItem value="ops">Operations</SelectItem>
                                </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-2">
                           <Label>Role</Label>
                           <Input placeholder="e.g. Designer" className="rounded-lg border-gray-100 bg-gray-50 focus-visible:ring-blue-900" />
                        </div>
                    </div>

                    <div className="space-y-2">
                       <Label>Branch</Label>
                       <Select>
                            <SelectTrigger className="rounded-lg border-gray-100 bg-gray-50">
                                <SelectValue placeholder="Select Branch" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="main">Main HQ</SelectItem>
                                <SelectItem value="east">East Campus</SelectItem>
                                <SelectItem value="north">North Base</SelectItem>
                            </SelectContent>
                       </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label>Employment Type</Label>
                           <Select>
                                <SelectTrigger className="rounded-lg border-gray-100 bg-gray-50">
                                    <SelectValue placeholder="Contract Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ft">Full-time</SelectItem>
                                    <SelectItem value="ct">Contract</SelectItem>
                                    <SelectItem value="it">Intern</SelectItem>
                                </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-2">
                           <Label>Joining Date</Label>
                           <Input type="date" className="rounded-lg border-gray-100 bg-gray-50 focus-visible:ring-blue-900"/>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <Button variant="ghost" className="rounded-xl px-6 h-12 text-gray-400 hover:bg-gray-50">Cancel</Button>
                        <Button className="rounded-xl bg-blue-900 hover:bg-black text-white px-10 h-12 shadow-md">
                            Save Employee
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
