"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface EditDepartmentPopUpProps {
    open: boolean;
    onClose: () => void;
    dept: any;
}

export default function EditDepartmentPopUp({ open, onClose, dept }: EditDepartmentPopUpProps) {
    if (!dept) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogOverlay className="fixed inset-0 z-50 bg-blue-950/10 backdrop-blur-[2px]" />

            <DialogContent className="z-50 sm:max-w-[450px] rounded-3xl bg-white p-0 overflow-hidden border border-gray-100 shadow-2xl">
                <DialogHeader className="bg-white border-b border-gray-50 p-8">
                    <DialogTitle className="text-2xl font-black text-blue-900">Edit Department</DialogTitle>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mt-1">Update unit details</p>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                       <Label htmlFor="deptname" className="text-xs font-bold uppercase text-gray-400">Department Name</Label>
                       <Input id="deptname" defaultValue={dept.name} className="rounded-xl border-gray-100 bg-gray-50 h-12 focus-visible:ring-blue-900" />
                    </div>
                    
                    <div className="space-y-2">
                       <Label htmlFor="deptlead" className="text-xs font-bold uppercase text-gray-400">Department Lead</Label>
                       <Input id="deptlead" defaultValue={dept.lead} className="rounded-xl border-gray-100 bg-gray-50 h-12 focus-visible:ring-blue-900" />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <Button variant="ghost" onClick={onClose} className="rounded-xl px-6 h-12 text-gray-400 hover:bg-gray-50">Cancel</Button>
                        <Button onClick={onClose} className="rounded-xl bg-blue-900 hover:bg-black text-white px-10 h-12 shadow-md font-bold">
                            Update Dept
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
