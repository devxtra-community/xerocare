"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"

export default function RoleDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="rounded-lg bg-blue-900 hover:bg-black text-white px-6 h-10 font-medium">
                   Add Role
                </Button>
            </DialogTrigger>	

            <DialogOverlay className="fixed inset-0 z-50 bg-blue-950/10 backdrop-blur-[2px]" />

            <DialogContent className="z-50 sm:max-w-[450px] rounded-3xl bg-white p-0 overflow-hidden border border-gray-100 shadow-2xl">
                <DialogHeader className="bg-white border-b border-gray-50 p-8">
                    <DialogTitle className="text-2xl font-black text-blue-900">New Role</DialogTitle>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mt-1">Define organization designation</p>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                       <Label className="text-xs font-bold uppercase text-gray-400">Role Title</Label>
                       <Input placeholder="e.g. Senior Technician" className="rounded-xl border-gray-100 bg-gray-50 h-12 focus-visible:ring-blue-900" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label className="text-xs font-bold uppercase text-gray-400">Department</Label>
                           <Select>
                                <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50 h-12">
                                    <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Sales">Sales</SelectItem>
                                    <SelectItem value="HR">HR</SelectItem>
                                    <SelectItem value="Finance">Finance</SelectItem>
                                    <SelectItem value="Service">Service</SelectItem>
                                    <SelectItem value="Warehouse">Warehouse</SelectItem>
                                </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-xs font-bold uppercase text-gray-400">Level</Label>
                           <Select>
                                <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50 h-12">
                                    <SelectValue placeholder="L1-L5" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="L1">Entry (L1)</SelectItem>
                                    <SelectItem value="L2">Associate (L2)</SelectItem>
                                    <SelectItem value="L3">Specialist (L3)</SelectItem>
                                    <SelectItem value="L4">Lead (L4)</SelectItem>
                                    <SelectItem value="L5">Director (L5)</SelectItem>
                                </SelectContent>
                           </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <Button variant="ghost" className="rounded-xl px-6 h-12 text-gray-400 hover:bg-gray-50">Cancel</Button>
                        <Button className="rounded-xl bg-blue-900 hover:bg-black text-white px-10 h-12 shadow-md font-bold">
                            Create Role
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
