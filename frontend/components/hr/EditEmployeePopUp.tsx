"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EditEmployeePopUpProps {
    open: boolean;
    onClose: () => void;
    employee: any;
}

export default function EditEmployeePopUp({ open, onClose, employee }: EditEmployeePopUpProps) {
    if (!employee) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogOverlay className="fixed inset-0 z-50 bg-blue-950/10 backdrop-blur-[2px]" />

            <DialogContent className="z-50 sm:max-w-[500px] rounded-3xl bg-white p-0 overflow-hidden border border-gray-100 shadow-2xl">
                <DialogHeader className="bg-white border-b border-gray-50 p-8">
                    <DialogTitle className="text-2xl font-black text-blue-900">Edit Profile</DialogTitle>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mt-1">Update employee records</p>
                </DialogHeader>

                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label htmlFor="fullname">Full Name</Label>
                           <Input id="fullname" defaultValue={employee.name} className="rounded-lg border-gray-100 bg-gray-50 focus-visible:ring-blue-600" />
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="empid">Employee ID</Label>
                           <Input id="empid" defaultValue={employee.id} disabled className="rounded-lg border-gray-100 bg-gray-200" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label>Department</Label>
                           <Select defaultValue={employee.dept.toLowerCase()}>
                                <SelectTrigger className="rounded-lg border-gray-100 bg-gray-50 uppercase text-[10px] font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="engineering">Engineering</SelectItem>
                                    <SelectItem value="marketing">Marketing</SelectItem>
                                    <SelectItem value="hr">HR</SelectItem>
                                    <SelectItem value="operations">Operations</SelectItem>
                                    <SelectItem value="strategy">Strategy</SelectItem>
                                </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-2">
                           <Label>Role</Label>
                           <Input defaultValue={employee.role} className="rounded-lg border-gray-100 bg-gray-50 focus-visible:ring-blue-600" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <Label>Status</Label>
                         <Select defaultValue={employee.status}>
                              <SelectTrigger className="rounded-lg border-gray-200 bg-gray-50">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="Active">Active</SelectItem>
                                  <SelectItem value="On Leave">On Leave</SelectItem>
                                  <SelectItem value="Resigned">Resigned</SelectItem>
                              </SelectContent>
                         </Select>
                      </div>
                      <div className="space-y-2">
                         <Label>Employment Type</Label>
                         <Select defaultValue={employee.type}>
                              <SelectTrigger className="rounded-lg border-gray-200 bg-gray-50">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="Full-time">Full-time</SelectItem>
                                  <SelectItem value="Contract">Contract</SelectItem>
                                  <SelectItem value="Intern">Intern</SelectItem>
                              </SelectContent>
                         </Select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <Button variant="ghost" onClick={onClose} className="rounded-xl px-6 h-12 text-gray-400 hover:bg-gray-50">Cancel</Button>
                        <Button onClick={onClose} className="rounded-xl bg-blue-900 hover:bg-black text-white px-10 h-12 shadow-md">
                            Update Record
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
