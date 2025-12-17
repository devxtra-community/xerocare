"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import RoleSelect from "./RoleSelect"


export default function AddEmployeeDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="rounded-full">Add Employee</Button>
            </DialogTrigger>

            <DialogOverlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md" />

            <DialogContent className="z-50 rounded-2xl bg-white text-foreground border border-border shadow-lg">
                <DialogHeader>
                    <DialogTitle >Add Employee</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <Input placeholder="Full Name" />
                    <RoleSelect />
                    <Input type="date" placeholder="Join Date"/>
                    <Input placeholder="Salary" />
                    <Input type="email" placeholder="Email" />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline">Cancel</Button>
                        <Button >
                            Confirm
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}