'use client';

import Image from 'next/image';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImagePlus, FileText, X, Plus, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Employee } from '@/lib/employee';
import {
  listEmployeeDocuments,
  uploadEmployeeDocument,
  deleteEmployeeDocument,
  documentExpiryStatus,
  EMPLOYEE_DOCUMENT_TYPE_OPTIONS,
  EMPLOYEE_DOCUMENT_TYPE_LABELS,
  type EmployeeDocument,
  type EmployeeDocumentType,
} from '@/lib/employeeDocument';
import { toast } from 'sonner';
import { getBranches, Branch } from '@/lib/branch';
import { getEmployeeJobOptions, EmployeeJob } from '@/lib/employeeJob';
import { getFinanceJobOptions, FinanceJob } from '@/lib/financeJob';
import { getUserFromToken } from '@/lib/auth';

import { getActiveCurrency } from '@/lib/currency';
import {
  COUNTRY_PHONE_OPTIONS,
  applyDialCode,
  countryFromPhone,
  dialCodeFor,
} from '@/lib/countryOptions';
interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Employee | null;
  /**
   * Persist the core employee record. Returns `ok` plus the employee id so the
   * dialog can flush staged document uploads/deletions against it afterwards
   * (the id isn't known up-front when creating).
   */
  onSubmit: (formData: FormData) => Promise<{ ok: boolean; employeeId?: string }>;
}

interface DraftDocument {
  tempId: string;
  file: File | null;
  docType: EmployeeDocumentType | '';
  label: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
}

const emptyDraft = (): DraftDocument => ({
  tempId: Math.random().toString(36).slice(2),
  file: null,
  docType: '',
  label: '',
  documentNumber: '',
  issueDate: '',
  expiryDate: '',
});

/**
 * Form dialog for creating or updating employee details.
 * Handles extensive form data including personal info, role, job details, and file uploads.
 * Dynamically shows fields based on selected role (e.g., specific job types for Employee/Finance).
 */
export default function EmployeeFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
}: EmployeeFormDialogProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'EMPLOYEE',
    employee_job: '' as EmployeeJob | '',
    finance_job: '' as FinanceJob | '',
    salary: '',
    expire_date: '',
    status: 'ACTIVE',
    branchId: '',
  });

  const [country, setCountry] = useState('');

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [idProof, setIdProof] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentUserBranch, setCurrentUserBranch] = useState<Branch | null>(null);

  // Multi-document store
  const [existingDocs, setExistingDocs] = useState<EmployeeDocument[]>([]);
  const [docsToDelete, setDocsToDelete] = useState<string[]>([]);
  const [draftDocs, setDraftDocs] = useState<DraftDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const idProofInputRef = useRef<HTMLInputElement>(null);

  // Get current user info
  const currentUser = getUserFromToken();
  const isAdmin = currentUser?.role === 'ADMIN';
  const isHR = currentUser?.role === 'HR';
  const userBranchId = currentUser?.branchId;

  // HR users need branch selection for MANAGER/HR roles
  const hrNeedsBranchSelect = isHR && (formData.role === 'MANAGER' || formData.role === 'HR');

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await getBranches();
        let branchList: Branch[] = [];
        if (response && response.success && Array.isArray(response.data)) {
          branchList = response.data;
          setBranches(response.data);
        } else if (Array.isArray(response)) {
          branchList = response;
          setBranches(response);
        }

        // Find and set current user's branch
        if (userBranchId && branchList.length > 0) {
          const userBranch = branchList.find((b) => (b.id || b.branch_id) === userBranchId);
          if (userBranch) {
            setCurrentUserBranch(userBranch);
          }
        }
      } catch (error) {
        console.error('Failed to fetch branches:', error);
      }
    };
    fetchBranches();
  }, [userBranchId]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        role: initialData.role || 'EMPLOYEE',
        employee_job: (initialData as Employee & { employee_job?: EmployeeJob }).employee_job || '',
        finance_job: (initialData as Employee & { finance_job?: FinanceJob }).finance_job || '',
        salary: initialData.salary?.toString() || '',
        expire_date: initialData.expire_date
          ? new Date(initialData.expire_date).toISOString().split('T')[0]
          : '',
        status: initialData.status || 'ACTIVE',
        branchId: initialData.branch_id || '',
      });
      setCountry(countryFromPhone(initialData.phone || ''));
      setProfilePreview(initialData.profile_image_url);
    } else {
      // For new employees, auto-fill branchId with HR's branch
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'EMPLOYEE',
        employee_job: '',
        finance_job: '',
        salary: '',
        expire_date: '',
        status: 'ACTIVE',
        branchId: !isAdmin && userBranchId ? userBranchId : '',
      });
      setCountry('');
      setProfilePreview(null);
      setProfileImage(null);
      setIdProof(null);
    }
    // Reset document staging whenever the dialog re-opens / target changes.
    setDocsToDelete([]);
    setDraftDocs([]);
    setExistingDocs([]);
  }, [initialData, open, isAdmin, userBranchId]);

  // Load the employee's stored documents when editing.
  useEffect(() => {
    if (!open || !initialData?.id) return;
    let cancelled = false;
    setDocsLoading(true);
    listEmployeeDocuments(initialData.id)
      .then((docs) => {
        if (!cancelled) setExistingDocs(docs);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load employee documents');
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, initialData?.id]);

  const updateDraft = (tempId: string, patch: Partial<DraftDocument>) =>
    setDraftDocs((prev) => prev.map((d) => (d.tempId === tempId ? { ...d, ...patch } : d)));

  const dialCode = dialCodeFor(country);

  const handleCountryChange = (iso2: string) => {
    setCountry(iso2);
    setFormData((prev) => ({ ...prev, phone: applyDialCode(prev.phone || '', dialCodeFor(iso2)) }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'role') {
      // Reset all job/department fields when role changes
      // If HR switches to MANAGER/HR role, clear branchId so they must pick one
      const needsBranchSelect = isHR && (value === 'MANAGER' || value === 'HR');
      setFormData((prev) => ({
        ...prev,
        role: value,
        employee_job: '',
        finance_job: '',
        branchId: needsBranchSelect ? '' : !isAdmin && userBranchId ? userBranchId : prev.branchId,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'profile' | 'id_proof',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'profile') {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setIdProof(file);
    }
  };

  const readyDrafts = draftDocs.filter((d) => d.file && d.docType);
  const incompleteDrafts = draftDocs.filter(
    (d) => (d.file && !d.docType) || (!d.file && d.docType),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (incompleteDrafts.length > 0) {
      toast.error('Each new document needs both a type and a file — or remove the empty row.');
      return;
    }
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('role', formData.role);
      if (formData.employee_job) {
        data.append('employee_job', formData.employee_job);
      }
      if (formData.finance_job) {
        data.append('finance_job', formData.finance_job);
      }
      data.append('salary', formData.salary);
      if (formData.expire_date) {
        data.append('expireDate', formData.expire_date);
      }
      if (formData.branchId) {
        data.append('branchId', formData.branchId);
      }
      data.append('status', formData.status);

      if (profileImage) {
        data.append('profile_image', profileImage);
      }
      if (idProof) {
        data.append('id_proof', idProof);
      }

      const result = await onSubmit(data);
      if (!result?.ok) return;

      const employeeId = result.employeeId || initialData?.id;
      if (employeeId && (docsToDelete.length > 0 || readyDrafts.length > 0)) {
        try {
          for (const docId of docsToDelete) {
            await deleteEmployeeDocument(employeeId, docId);
          }
          for (const d of readyDrafts) {
            await uploadEmployeeDocument(employeeId, {
              file: d.file as File,
              docType: d.docType as EmployeeDocumentType,
              label: d.label.trim() || undefined,
              documentNumber: d.documentNumber.trim() || undefined,
              issueDate: d.issueDate || undefined,
              expiryDate: d.expiryDate || undefined,
            });
          }
        } catch (err) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Employee saved, but some documents failed to upload.';
          toast.error(message);
        }
      }

      onOpenChange(false);
    } catch {
      // Error is handled in the onSubmit parent function
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary text-center">
            {initialData ? 'Update Employee' : 'Add New Employee'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative h-24 w-24 rounded-full bg-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center cursor-pointer overflow-hidden group"
              onClick={() => profileInputRef.current?.click()}
            >
              {profilePreview ? (
                <Image src={profilePreview} alt="Profile preview" fill className="object-cover" />
              ) : (
                <ImagePlus className="h-8 w-8 text-blue-400 group-hover:text-blue-500 transition-colors" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-[10px] text-white font-bold">CHANGE</span>
              </div>
            </div>
            <input
              type="file"
              ref={profileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'profile')}
            />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Profile Picture
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                First Name
              </label>
              <Input
                name="first_name"
                placeholder="John"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Last Name
              </label>
              <Input
                name="last_name"
                placeholder="Doe"
                value={formData.last_name}
                onChange={handleChange}
                required
                className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Email Address
              </label>
              <Input
                name="email"
                type="email"
                placeholder="john.doe@xerocare.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={!!initialData}
                className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Country
              </label>
              <SearchableSelect
                value={country}
                onValueChange={handleCountryChange}
                options={COUNTRY_PHONE_OPTIONS}
                placeholder="Select country"
                emptyText="No country found."
                className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Phone Number <span className="normal-case text-gray-300">(optional)</span>
              </label>
              <Input
                name="phone"
                type="tel"
                placeholder={dialCode ? `${dialCode} 50 123 4567` : 'Select a country first'}
                value={formData.phone}
                onChange={handleChange}
                className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Role / Designation
              </label>
              <Select
                value={formData.role}
                onValueChange={(val) => handleSelectChange('role', val)}
              >
                <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="FINANCE">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Employee Job - Only show for EMPLOYEE role */}
            {formData.role === 'EMPLOYEE' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Employee Job / Responsibility *
                </label>
                <Select
                  value={formData.employee_job}
                  onValueChange={(val) => handleSelectChange('employee_job', val)}
                  required={formData.role === 'EMPLOYEE'}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {getEmployeeJobOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Finance Job - Only show for FINANCE role */}
            {formData.role === 'FINANCE' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Finance Job / Responsibility *
                </label>
                <Select
                  value={formData.finance_job}
                  onValueChange={(val) => handleSelectChange('finance_job', val)}
                  required={formData.role === 'FINANCE'}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                    <SelectValue placeholder="Select finance job type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {getFinanceJobOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Salary ({getActiveCurrency()})
              </label>
              <Input
                name="salary"
                type="number"
                placeholder="5000"
                value={formData.salary}
                onChange={handleChange}
                required
                className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Contract Expire Date
              </label>
              <Input
                name="expire_date"
                type="date"
                value={formData.expire_date}
                onChange={handleChange}
                className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Employee Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(val) => handleSelectChange('status', val)}
              >
                <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus:ring-2 focus:ring-blue-400">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ACTIVE" className="text-green-600 font-medium">
                    Active
                  </SelectItem>
                  <SelectItem value="INACTIVE" className="text-amber-600 font-medium">
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Assigned Branch
              </label>
              {isAdmin || hrNeedsBranchSelect ? (
                <SearchableSelect
                  value={formData.branchId}
                  onValueChange={(val) => handleSelectChange('branchId', val)}
                  options={branches.map((branch) => ({
                    value: branch.id || branch.branch_id || '',
                    label: branch.name,
                  }))}
                  placeholder="Select Branch"
                  emptyText="No branches found."
                  className="h-12 rounded-xl bg-muted/50 border-none shadow-sm focus:ring-2 focus:ring-blue-400"
                />
              ) : (
                <div className="h-12 rounded-xl bg-gray-100 border-none shadow-sm flex items-center px-4 text-gray-700 font-medium">
                  {currentUserBranch?.name || 'Loading...'}
                </div>
              )}
            </div>
          </div>

          {/* ID Proof Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              ID Proof Document (Passport/Emirates ID)
            </label>
            <div
              className={`h-20 rounded-xl border-2 border-dashed flex items-center justify-between px-6 cursor-pointer transition-colors ${
                idProof
                  ? 'border-green-200 bg-green-50'
                  : 'border-border bg-muted/50 hover:border-blue-200'
              }`}
              onClick={() => idProofInputRef.current?.click()}
            >
              <div className="flex items-center gap-3">
                <FileText className={`h-5 w-5 ${idProof ? 'text-green-500' : 'text-gray-400'}`} />
                <span
                  className={`text-sm ${idProof ? 'text-green-700 font-medium' : 'text-muted-foreground'}`}
                >
                  {idProof ? idProof.name : 'Click to upload ID proof'}
                </span>
              </div>
              {idProof && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdProof(null);
                  }}
                  className="p-1 hover:bg-green-100 rounded-full text-green-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <input
              type="file"
              ref={idProofInputRef}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e, 'id_proof')}
            />
          </div>

          {/* Legal Documents (Passport / Visa / Contract / License …) */}
          <div className="space-y-3 border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Legal Documents
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg text-xs"
                onClick={() => setDraftDocs((prev) => [...prev, emptyDraft()])}
              >
                <Plus className="h-3.5 w-3.5" /> Add document
              </Button>
            </div>

            {docsLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading documents…
              </div>
            )}

            {/* Existing documents (edit mode) */}
            {existingDocs.map((doc) => {
              const pendingDelete = docsToDelete.includes(doc.id);
              const status = documentExpiryStatus(doc.expiry_date);
              return (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm ${
                    pendingDelete
                      ? 'border-red-100 bg-red-50/60 opacity-60'
                      : 'border-gray-100 bg-muted/40'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {EMPLOYEE_DOCUMENT_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                      </span>
                      {doc.label && (
                        <span className="text-xs text-muted-foreground">· {doc.label}</span>
                      )}
                      {doc.document_number && (
                        <span className="text-xs text-muted-foreground">
                          · {doc.document_number}
                        </span>
                      )}
                      {status === 'expired' && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                          EXPIRED
                        </span>
                      )}
                      {status === 'soon' && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                          EXPIRES SOON
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {doc.expiry_date ? `Expiry ${doc.expiry_date}` : 'No expiry'} ·{' '}
                      {doc.file_name || 'file'}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {doc.viewUrl && !pendingDelete && (
                      <a
                        href={doc.viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full p-1.5 text-blue-600 hover:bg-blue-50"
                        title="Open document"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      className="rounded-full p-1.5 text-red-600 hover:bg-red-50"
                      title={pendingDelete ? 'Keep document' : 'Remove document'}
                      onClick={() =>
                        setDocsToDelete((prev) =>
                          pendingDelete ? prev.filter((x) => x !== doc.id) : [...prev, doc.id],
                        )
                      }
                    >
                      {pendingDelete ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* New document drafts */}
            {draftDocs.map((d) => (
              <div
                key={d.tempId}
                className="space-y-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                    New document
                  </span>
                  <button
                    type="button"
                    className="rounded-full p-1 text-gray-500 hover:bg-white"
                    onClick={() =>
                      setDraftDocs((prev) => prev.filter((x) => x.tempId !== d.tempId))
                    }
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Type *
                    </label>
                    <Select
                      value={d.docType}
                      onValueChange={(val) =>
                        updateDraft(d.tempId, { docType: val as EmployeeDocumentType })
                      }
                    >
                      <SelectTrigger className="h-10 rounded-lg bg-white text-sm">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {EMPLOYEE_DOCUMENT_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Document No.
                    </label>
                    <Input
                      value={d.documentNumber}
                      onChange={(e) => updateDraft(d.tempId, { documentNumber: e.target.value })}
                      placeholder="e.g. A1234567"
                      className="h-10 rounded-lg bg-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Label
                    </label>
                    <Input
                      value={d.label}
                      onChange={(e) => updateDraft(d.tempId, { label: e.target.value })}
                      placeholder="Optional note"
                      className="h-10 rounded-lg bg-white text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Issue date
                      </label>
                      <Input
                        type="date"
                        value={d.issueDate}
                        onChange={(e) => updateDraft(d.tempId, { issueDate: e.target.value })}
                        className="h-10 rounded-lg bg-white text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Expiry date
                      </label>
                      <Input
                        type="date"
                        value={d.expiryDate}
                        onChange={(e) => updateDraft(d.tempId, { expiryDate: e.target.value })}
                        className="h-10 rounded-lg bg-white text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    File *
                  </label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => updateDraft(d.tempId, { file: e.target.files?.[0] ?? null })}
                    className="h-10 rounded-lg bg-white text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
                  />
                </div>
              </div>
            ))}

            {!docsLoading && existingDocs.length === 0 && draftDocs.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No documents yet. Add passport, visa, labour contract, licenses, etc.
              </p>
            )}
          </div>

          <div className="flex justify-end items-center gap-6 pt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-sm font-bold text-foreground hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 px-10 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold shadow-lg disabled:opacity-70"
            >
              {isSubmitting ? 'Processing...' : initialData ? 'Update Employee' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
