'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  ShieldCheck,
  FileText,
  User,
  GraduationCap,
  Loader2,
  Clock,
  Undo2,
} from 'lucide-react';
import { getEmployeeById, getEmployeeIdProof, Employee } from '@/lib/employee';
import { getEmployeeRecentActivity, EmployeeActivityRow } from '@/lib/invoice';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';
import { EMPLOYEE_JOB_LABELS, EmployeeJob } from '@/lib/employeeJob';
import { FINANCE_JOB_LABELS, FinanceJob } from '@/lib/financeJob';
import { getUserFromToken } from '@/lib/auth';
import { SessionsDialog } from '@/components/SessionsDialog';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { toast } from 'sonner';

const SALE_TYPE_LABELS: Record<string, string> = {
  SALE: 'Sale',
  PRODUCT_SALE: 'Sale',
  SPAREPART_SALE: 'Spare Part Sale',
  RENT: 'Rent',
  LEASE: 'Lease',
  SERVICE: 'Service',
};

export default function EmployeeProfilePage() {
  const currency = useBranchCurrency();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState(false);
  const [activity, setActivity] = useState<EmployeeActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const isSelfView = getUserFromToken()?.userId === id;

  useEffect(() => {
    async function fetchEmployee() {
      try {
        setLoading(true);
        const res = await getEmployeeById(id);
        if (res && res.success && res.data) {
          setEmployee(res.data);
        } else {
          toast.error('Failed to load employee profile');
        }
      } catch (err) {
        console.error('Failed to load employee details:', err);
        toast.error('Failed to connect to employee service');
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      fetchEmployee();
    }
  }, [id]);

  useEffect(() => {
    async function fetchActivity() {
      try {
        setActivityLoading(true);
        const rows = await getEmployeeRecentActivity(id);
        setActivity(rows);
      } catch (err) {
        console.error('Failed to load employee activity:', err);
      } finally {
        setActivityLoading(false);
      }
    }
    if (id) {
      fetchActivity();
    }
  }, [id]);

  const handleViewIdProof = async () => {
    if (viewingDoc) return;
    try {
      setViewingDoc(true);
      const res = await getEmployeeIdProof(id);
      if (res && res.success && res.data?.url) {
        window.open(res.data.url, '_blank');
      } else {
        toast.error('Failed to fetch the document URL');
      }
    } catch (err) {
      console.error('Error fetching document:', err);
      toast.error('Failed to load ID Proof document');
    } finally {
      setViewingDoc(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/50 p-6 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">Loading employee details...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/50 p-6 space-y-4">
        <p className="text-lg font-bold text-slate-800">Employee not found</p>
        <Button onClick={() => router.back()} className="bg-blue-600 hover:bg-blue-700 text-white">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown';

  // Format role
  let roleDisplay = employee.role || 'Staff';
  if (employee.role === 'MANAGER') roleDisplay = 'Branch Manager';
  else if (employee.role === 'HR') roleDisplay = 'HR Specialist';
  else if (employee.role === 'FINANCE') roleDisplay = 'Finance Manager';

  // Format department
  let deptDisplay = 'Other';
  if (employee.role === 'MANAGER') deptDisplay = 'Management';
  else if (employee.role === 'HR') deptDisplay = 'Human Resources';
  else if (employee.role === 'FINANCE') {
    deptDisplay = employee.finance_job
      ? FINANCE_JOB_LABELS[employee.finance_job as FinanceJob] || employee.finance_job
      : 'Finance';
  } else if (employee.role === 'EMPLOYEE') {
    deptDisplay = employee.employee_job
      ? EMPLOYEE_JOB_LABELS[employee.employee_job as EmployeeJob] || employee.employee_job
      : 'Employee';
  }

  const joiningDate = employee.createdAt
    ? new Date(employee.createdAt).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const visaExpire = employee.expire_date
    ? new Date(employee.expire_date).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const statusLabel = employee.status === 'ACTIVE' ? 'Active' : 'Inactive';

  return (
    <div className="min-h-screen bg-muted/50 p-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-card"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-medium shadow-sm">
              {fullName.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary flex items-center gap-3">
                {fullName}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    employee.status === 'ACTIVE'
                      ? 'bg-green-50 text-green-700 border-green-100'
                      : 'bg-orange-50 text-orange-700 border-orange-100'
                  }`}
                >
                  {statusLabel}
                </span>
              </h3>
              <p className="text-sm text-muted-foreground">
                {roleDisplay} &middot; {deptDisplay}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED INFO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PERSONAL INFO */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-6 pb-3 border-b border-gray-100">
              <User className="h-4 w-4 text-muted-foreground" /> Personal Information
            </h4>
            <div className="space-y-5">
              <InfoRow icon={<Mail />} label="Email" value={employee.email} isCritical />
              <InfoRow icon={<Phone />} label="Phone" value={employee.phone || '—'} />
              <InfoRow
                icon={<MapPin />}
                label="Branch"
                value={employee.branch?.name || 'Main Branch'}
              />
              <InfoRow icon={<GraduationCap />} label="Education" value="Not Provided" />
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-6 pb-3 border-b border-gray-100">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Documents
            </h4>
            <div className="space-y-3">
              {employee.id_proof_key ? (
                <DocumentRow
                  name="ID Proof / Passport Document"
                  size="S3 Key Scan copy"
                  onView={handleViewIdProof}
                  loading={viewingDoc}
                />
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">
                    No documents uploaded for this employee.
                  </p>
                </div>
              )}
            </div>
          </div>

          {isSelfView && (
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-6 pb-3 border-b border-gray-100">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Account
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-9 text-xs"
                  onClick={() => setIsSessionsOpen(true)}
                >
                  Session Info
                </Button>
                <Button
                  variant="outline"
                  className="h-9 text-xs"
                  onClick={() => setIsPasswordOpen(true)}
                >
                  Change Password
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* WORK INFO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-6 pb-3 border-b border-gray-100">
              <Briefcase className="h-4 w-4 text-muted-foreground" /> Employment Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-6">
                <InfoRow icon={<Calendar />} label="Joining Date" value={joiningDate} isCritical />
                <InfoRow icon={<Briefcase />} label="Department" value={deptDisplay} isCritical />
                <InfoRow
                  icon={<Briefcase />}
                  label="Monthly Salary"
                  value={
                    employee.salary
                      ? `${formatCurrency(Number(employee.salary), currency)} / month`
                      : '—'
                  }
                />
              </div>
              <div className="space-y-6">
                <InfoRow icon={<ShieldCheck />} label="Visa Expiry" value={visaExpire} isCritical />
                <InfoRow
                  icon={<User />}
                  label="Report To"
                  value={employee.reporting_manager || 'Main Manager'}
                />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-6 pb-3 border-b border-gray-100">
              <Clock className="h-4 w-4 text-muted-foreground" /> Recent Activity
            </h4>
            {activityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No sales, rent, or lease activity yet.
              </p>
            ) : (
              <div className="space-y-1">
                {activity.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700">
                          {SALE_TYPE_LABELS[a.saleType] || a.saleType}
                        </span>
                        {a.returnCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600">
                            <Undo2 className="h-3 w-3" />
                            {a.returnCount > 1 ? `${a.returnCount} Returns` : 'Returned'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground truncate mt-1">
                        {a.customerName || a.invoiceNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.invoiceNumber} &middot;{' '}
                        {new Date(a.createdAt).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-primary">
                        {formatCurrency(a.totalAmount, a.currencyCode || currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isSelfView && (
        <>
          <SessionsDialog open={isSessionsOpen} onOpenChange={setIsSessionsOpen} />
          <ChangePasswordDialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen} />
        </>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isCritical = false,
}: {
  icon: React.ReactElement;
  label: string;
  value: string;
  isLarge?: boolean;
  isCritical?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-0.5 text-gray-400 *:h-4 *:w-4">{icon}</div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${isCritical ? 'text-primary' : 'text-foreground'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function DocumentRow({
  name,
  size,
  onView,
  loading,
}: {
  name: string;
  size: string;
  onView: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 bg-gray-100 text-muted-foreground rounded flex items-center justify-center">
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-medium text-foreground truncate max-w-[150px]">{name}</p>
          <p className="text-xs text-muted-foreground">{size}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-primary hover:text-primary hover:bg-transparent px-2 h-8"
        onClick={onView}
        disabled={loading}
      >
        {loading ? 'Opening...' : 'View'}
      </Button>
    </div>
  );
}
