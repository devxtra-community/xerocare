"use client"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface DeleteDepartmentPopUpProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    deptName: string;
}

export default function DeleteDepartmentPopUp({ open, onClose, onConfirm, deptName }: DeleteDepartmentPopUpProps) {
    return (
        <AlertDialog open={open} onOpenChange={onClose}>
            <AlertDialogContent className="rounded-[40px] border-none shadow-2xl p-8">
                <AlertDialogHeader className="space-y-3">
                    <AlertDialogTitle className="text-2xl font-black text-blue-900">Remove Department?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-500 font-medium">
                        This will permanently delete the <strong className="text-red-600 uppercase text-xs">{deptName}</strong> unit. All associated role data will be affected.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
                    <AlertDialogCancel onClick={onClose} className="rounded-2xl border-gray-100 h-12 px-8 font-bold text-gray-400 hover:bg-gray-50 hover:text-gray-600">Reconsider</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="rounded-2xl bg-red-600 hover:bg-red-700 text-white border-none h-12 px-10 font-bold shadow-lg shadow-red-600/20">
                        Yes, Delete Unit
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
