"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"

export default function DepartmentDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="rounded-lg bg-blue-900 hover:bg-black text-white px-6 h-10 font-medium">
                   Add Department
                </Button>
            </DialogTrigger>	

            <DialogOverlay className="fixed inset-0 z-50 bg-blue-950/10 backdrop-blur-[2px]" />

            <DialogContent className="z-50 sm:max-w-[450px] rounded-3xl bg-white p-0 overflow-hidden border border-gray-100 shadow-2xl">
                <DialogHeader className="bg-white border-b border-gray-50 p-8">
                    <DialogTitle className="text-2xl font-black text-blue-900">New Department</DialogTitle>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mt-1">Create a new business unit</p>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                       <Label htmlFor="deptname" className="text-xs font-bold uppercase text-gray-400">Department Name</Label>
                       <Input id="deptname" placeholder="e.g. Service" className="rounded-xl border-gray-100 bg-gray-50 h-12 focus-visible:ring-blue-900" />
                    </div>
                    
                    <div className="space-y-2">
                       <Label htmlFor="deptlead" className="text-xs font-bold uppercase text-gray-400">Department Lead</Label>
                       <Input id="deptlead" placeholder="Assign a lead" className="rounded-xl border-gray-100 bg-gray-50 h-12 focus-visible:ring-blue-900" />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <Button variant="ghost" className="rounded-xl px-6 h-12 text-gray-400 hover:bg-gray-50">Cancel</Button>
                        <Button className="rounded-xl bg-blue-900 hover:bg-black text-white px-10 h-12 shadow-md font-bold">
                            Create Dept
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
