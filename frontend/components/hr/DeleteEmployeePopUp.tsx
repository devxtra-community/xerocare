"use client"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface DeleteEmployeePopUpProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    employeeName: string;
}

export default function DeleteEmployeePopUp({ open, onClose, onConfirm, employeeName }: DeleteEmployeePopUpProps) {
    return (
        <AlertDialog open={open} onOpenChange={onClose}>
            <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-bold text-gray-900">Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-500">
                        This will permanently delete the record for <strong className="text-red-600">{employeeName}</strong>. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-0">
                    <AlertDialogCancel onClick={onClose} className="rounded-xl border-gray-100 hover:bg-gray-50">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="rounded-xl bg-red-600 hover:bg-red-700 text-white border-none px-6">
                        Delete Employee
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
