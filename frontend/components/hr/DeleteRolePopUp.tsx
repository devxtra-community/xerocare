"use client"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface DeleteRolePopUpProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    roleName: string;
}

export default function DeleteRolePopUp({ open, onClose, onConfirm, roleName }: DeleteRolePopUpProps) {
    return (
        <AlertDialog open={open} onOpenChange={onClose}>
            <AlertDialogContent className="rounded-[40px] border-none shadow-2xl p-8">
                <AlertDialogHeader className="space-y-3">
                    <AlertDialogTitle className="text-2xl font-black text-blue-900">Delete Designation?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-500 font-medium">
                        This will permanently remove the <strong className="text-red-600 uppercase text-xs">{roleName}</strong> role. Employees assigned to this role will need reassignment.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-8 gap-3 sm:gap-0">
                    <AlertDialogCancel onClick={onClose} className="rounded-2xl border-gray-100 h-12 px-8 font-bold text-gray-400 hover:bg-gray-50">Reconsider</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="rounded-2xl bg-red-600 hover:bg-red-700 text-white border-none h-12 px-10 font-bold shadow-lg shadow-red-600/20">
                        Confirm Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
