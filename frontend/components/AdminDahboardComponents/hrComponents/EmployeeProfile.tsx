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
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* Premium Header */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/60 transition-all">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="rounded-xl h-10 w-10 p-0 hover:bg-slate-100 text-slate-600 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-black text-primary tracking-tight">Employee Portfolio</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  System ID:
                </span>
                <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {emp.display_id || '---'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              className={`px-3 py-1 rounded-lg font-bold text-[11px] uppercase tracking-wider border-0 ${
                emp.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100'
                  : 'bg-rose-50 text-rose-600 shadow-sm shadow-rose-100'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full mr-2 ${emp.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}
              />
              {emp.status}
            </Badge>
            <Button
              className="bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs h-9 px-4 shadow-lg shadow-primary/20 transition-all active:scale-95"
              onClick={handleDownloadIdProof}
            >
              <Download className="h-3.5 w-3.5 mr-2" />
              Export Dossier
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column - Profile Summary */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-8 border border-slate-200/50 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

              <div className="relative flex flex-col items-center">
                <div className="h-32 w-32 rounded-3xl bg-slate-50 border-4 border-white shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6 overflow-hidden relative transition-transform group-hover:rotate-2">
                  {emp.profile_image_url ? (
                    <Image src={emp.profile_image_url} alt="" fill className="object-cover" />
                  ) : (
                    <span className="text-4xl font-black text-primary/20">
                      {(emp.first_name?.[0] || emp.email[0]).toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {emp.first_name} {emp.last_name}
                </h3>
                <p className="text-sm font-bold text-blue-600 mt-1 uppercase tracking-widest">
                  {emp.role}
                </p>

                <div className="w-full grid grid-cols-2 gap-3 mt-8">
                  <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center justify-center text-center border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Leaves
                    </span>
                    <span className="text-lg font-black text-primary italic">
                      04 <span className="text-[10px] opacity-40">Days</span>
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center justify-center text-center border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Late
                    </span>
                    <span className="text-lg font-black text-primary italic">
                      02 <span className="text-[10px] opacity-40">Times</span>
                    </span>
                  </div>
                </div>

                <div className="w-full mt-8 pt-8 border-t border-slate-100 space-y-5">
                  <div className="flex items-center gap-4 group/item">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center transition-colors group-hover/item:bg-blue-600 group-hover/item:text-white">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Email Address
                      </span>
                      <span className="text-[13px] font-bold text-slate-700">{emp.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group/item">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center transition-colors group-hover/item:bg-blue-600 group-hover/item:text-white">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Department
                      </span>
                      <span className="text-[13px] font-bold text-slate-700">
                        {emp.branch?.name || 'Main Operations'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                Security Access
              </h4>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed mb-4">
                  Employee has standard access to the {emp.role?.toLowerCase()} dashboard and
                  internal logistics tools.
                </p>
                <Button
                  variant="outline"
                  className="w-full bg-white border-slate-200 text-slate-700 rounded-xl font-bold text-xs h-10 hover:bg-slate-50 transition-all border-b-2"
                  onClick={handleDownloadIdProof}
                >
                  Verify Primary Document
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Work Details */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200/50 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-10 w-64 h-64 bg-primary/5 rounded-full -mt-32 -mr-32 blur-3xl opacity-50" />

              <h4 className="text-xl font-black text-slate-900 mb-8 border-b border-slate-100 pb-6 flex items-center justify-between">
                Contractual Overview
                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full uppercase italic">
                  Full-Time Basis
                </span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                <div className="flex gap-4 group/feat">
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/feat:bg-primary/10 group-hover/feat:text-primary transition-all">
                    <CircleDollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">
                      Monthly Remuneration
                    </p>
                    <p className="text-2xl font-black text-slate-900 italic">
                      <span className="text-sm font-bold text-primary not-italic mr-1">AED</span>
                      {emp.salary?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 group/feat">
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/feat:bg-primary/10 group-hover/feat:text-primary transition-all">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">
                      Registration Date
                    </p>
                    <p className="text-lg font-black text-slate-900">
                      {new Date(emp.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 group/feat">
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/feat:bg-primary/10 group-hover/feat:text-primary transition-all">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">
                      Visa Expiry Status
                    </p>
                    <p className="text-lg font-black text-slate-900">
                      {emp.expire_date
                        ? new Date(emp.expire_date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Indefinite Contract'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 group/feat">
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/feat:bg-primary/10 group-hover/feat:text-primary transition-all">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">
                      Assigned Branch
                    </p>
                    <p className="text-lg font-black text-slate-900">
                      {emp.branch?.name || 'General Operations'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
