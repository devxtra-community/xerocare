'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  Mail,
  Briefcase,
  Calendar,
  Loader2,
  CircleDollarSign,
  ShieldAlert,
  Download,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { getEmployeeById, getEmployeeIdProof, Employee } from '@/lib/employee';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';

interface EmployeeProfileProps {
  id: string;
}

/**
 * Detailed view of a single employee's profile.
 * Displays personal info, usage stats (leaves/lates), and ID proof access.
 * Provides a comprehensive portfolio view for HR management.
 */
export default function EmployeeProfile({ id }: EmployeeProfileProps) {
  const router = useRouter();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await getEmployeeById(id);
        if (response.success) {
          setEmp(response.data);
        }
      } catch {
        toast.error('Failed to load employee profile');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployee();
  }, [id, router]);

  const handleDownloadIdProof = async () => {
    try {
      const response = await getEmployeeIdProof(id);
      if (response.data.url) {
        window.open(response.data.url, '_blank');
      } else {
        toast.error('ID Proof not available');
      }
    } catch {
      toast.error('Failed to get ID Proof link');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-transparent gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-foreground">Employee Not Found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50/50 p-6 space-y-8">
      {/* Header */}
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
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-foreground">Employee Portfolio</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>ID: {emp.display_id || '---'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={`px-2.5 py-0.5 rounded-md font-medium text-xs ${
              emp.status === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {emp.status}
          </Badge>
          <Button className="gap-2 h-9 font-medium px-4" onClick={handleDownloadIdProof}>
            <Download className="h-4 w-4" />
            Export Dossier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 leading-relaxed">
        {/* Left Column - Profile Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col items-center">
            <div className="h-28 w-28 rounded-full bg-gray-100 border-4 border-white shadow-sm flex items-center justify-center mb-4 overflow-hidden relative">
              {emp.profile_image_url ? (
                <Image src={emp.profile_image_url} alt="" fill className="object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {(emp.first_name?.[0] || emp.email[0]).toUpperCase()}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-primary text-center">
              {emp.first_name} {emp.last_name}
            </h3>
            <p className="text-sm font-medium text-muted-foreground mb-6 text-center">{emp.role}</p>

            <div className="w-full grid grid-cols-2 gap-3 mb-6">
              <div className="bg-muted/50 p-3 rounded-lg border border-gray-100 flex flex-col items-center text-center">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Leaves
                </span>
                <span className="text-lg font-bold text-primary">04</span>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg border border-gray-100 flex flex-col items-center text-center">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Late
                </span>
                <span className="text-lg font-bold text-primary">02</span>
              </div>
            </div>

            <div className="w-full space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted/50 text-muted-foreground flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs text-gray-400 font-medium uppercase">Email</span>
                  <span className="text-sm font-medium text-primary truncate" title={emp.email}>
                    {emp.email}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted/50 text-muted-foreground flex items-center justify-center">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-medium uppercase">Department</span>
                  <span className="text-sm font-medium text-primary">
                    {emp.branch?.name || 'Main Operations'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Security Access
            </h4>
            <div className="p-4 bg-muted/50 rounded-lg border border-gray-100 border-dashed">
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Employee has standard access to the {emp.role?.toLowerCase()} dashboard and internal
                logistics tools.
              </p>
              <Button
                variant="outline"
                className="w-full h-8 text-xs"
                onClick={handleDownloadIdProof}
              >
                Verify Primary Document
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column - Work Details */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h4 className="text-lg font-bold text-foreground">Contractual Overview</h4>
              <Badge variant="secondary" className="font-medium">
                Full-Time Basis
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
              <DetailRow
                icon={<CircleDollarSign />}
                label="Monthly Remuneration"
                value={formatCurrency(emp.salary || 0)}
              />
              <DetailRow
                icon={<Calendar />}
                label="Registration Date"
                value={new Date(emp.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              />
              <DetailRow
                icon={<ShieldAlert />}
                label="Visa Expiry Status"
                value={
                  emp.expire_date
                    ? new Date(emp.expire_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Indefinite Contract'
                }
              />
              <DetailRow
                icon={<Briefcase />}
                label="Assigned Branch"
                value={emp.branch?.name || 'General Operations'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactElement;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="h-10 w-10 shrink-0 rounded-lg bg-muted/50 flex items-center justify-center text-gray-400 *:h-5 *:w-5">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-base font-semibold text-primary">{value}</p>
      </div>
    </div>
  );
}
