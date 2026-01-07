'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Briefcase,
  Calendar,
  Loader2,
  CircleDollarSign,
  User,
  ShieldAlert,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { getEmployeeById, getEmployeeIdProof, Employee } from '@/lib/employee';
import { toast } from 'sonner';

interface EmployeeProfileProps {
  id: string;
}

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
        router.push('/admin/human-resource');
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
      <div className="flex justify-center items-center min-h-screen bg-blue-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-blue-50 gap-4">
        <ShieldAlert className="h-16 w-16 text-red-500" />
        <h2 className="text-2xl font-bold text-gray-900">Employee Not Found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="rounded-full h-10 w-10 p-0 bg-white hover:bg-gray-50 shadow-sm"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-blue-900">Employee Profile</h2>
          <p className="text-sm text-gray-500 font-medium">
            Employee ID:{' '}
            <span className="text-blue-600 border-b border-blue-200">
              {emp.display_id || '---'}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-3xl mb-4 overflow-hidden">
              {emp.profile_image_url ? (
                // eslint-disable-next-line
                <img src={emp.profile_image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (emp.first_name?.[0] || emp.email[0]).toUpperCase()
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {emp.first_name} {emp.last_name}
            </h3>
            <p className="text-sm text-primary font-medium">{emp.role}</p>
            <Badge
              variant="outline"
              className={`mt-3 border-none px-3 py-1 ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
            >
              {emp.status}
            </Badge>

            <div className="w-full mt-6 pt-6 border-t border-gray-100 space-y-4 text-left">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{emp.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <User className="h-4 w-4 text-gray-400" />
                <span>Internal ID: {emp.display_id || '---'}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>System: {emp.id?.split('-')[0]}...</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-4">
              Documents
            </h4>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 rounded-xl"
              onClick={handleDownloadIdProof}
            >
              <Download className="h-4 w-4" />
              View ID Proof
            </Button>
          </div>
        </div>

        {/* Right Column: Detailed Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h4 className="text-lg font-bold text-blue-900 mb-6 border-b pb-4">
              Employment Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Designation</p>
                  <p className="text-sm font-semibold text-gray-900">{emp.role}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <CircleDollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Salary (Monthly)</p>
                  <p className="text-sm font-semibold text-gray-900">
                    AED {emp.salary?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Joining Date</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(emp.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Expiry Date</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {emp.expire_date
                      ? new Date(emp.expire_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                      : 'No expiry set'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Last Updated</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(emp.updatedAt).toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
