'use client';

import React from 'react';
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
} from 'lucide-react';
import StatCard from '@/components/StatCard';

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Mock employee data
  const employee = {
    id: id || '1',
    name: 'Arjun Mehta',
    role: 'Senior Sales Executive',
    department: 'Sales',
    status: 'Active',
    email: 'arjun@xerocare.com',
    phone: '+91 9876543210',
    address: '45, Skyline Apartments, Hitech City, Hyderabad - 500081',
    joiningDate: '15 Jan 2023',
    visaExpire: '12 Jun 2025',
    salary: '₹85,000 / month',
    attendance: '94%',
    leaves: '4 / 12',
    performance: 'Excellent',
    idProof: 'AadharCard_Arjun.pdf',
    visaCopy: 'Visa_Arjun_2025.pdf',
    education: 'MBA in Marketing, IIM Bangalore',
  };

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 bg-white shadow-sm ring-1 ring-blue-200/50 hover:bg-blue-50"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5 text-blue-900" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/20">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-blue-900 flex items-center gap-3">
                {employee.name}
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-green-100 text-green-700 uppercase font-bold tracking-wider">
                  {employee.status}
                </span>
              </h3>
              <p className="text-sm text-blue-600 font-bold uppercase tracking-wide">
                {employee.role} • {employee.department}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="bg-white text-blue-900 border-blue-200 hover:bg-blue-50 gap-2 h-10 font-bold px-5 rounded-xl shadow-sm">
            <Mail className="h-4 w-4" /> Message
          </Button>
          <Button className="bg-primary text-white hover:bg-primary/90 gap-2 h-10 font-bold px-5 rounded-xl shadow-lg shadow-primary/20">
            Edit Profile
          </Button>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Attendance" value={employee.attendance} subtitle="Monthly Avg" />
        <StatCard title="Leaves Taken" value={employee.leaves} subtitle="Annual Balance" />
        <StatCard title="Performance" value={employee.performance} subtitle="Q4 Review" />
        <StatCard title="Monthly Pay" value={employee.salary} subtitle="Base + HRA" />
      </div>

      {/* DETAILED INFO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PERSONAL INFO */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-blue-100/50 p-6">
            <h4 className="text-xs font-bold text-blue-900 uppercase flex items-center gap-2 mb-6 tracking-widest pb-3 border-b border-gray-50">
              <User className="h-4 w-4 text-primary" /> Personal Information
            </h4>
            <div className="space-y-5">
              <InfoRow icon={<Mail />} label="Email" value={employee.email} />
              <InfoRow icon={<Phone />} label="Phone" value={employee.phone} />
              <InfoRow icon={<MapPin />} label="Address" value={employee.address} isLarge />
              <InfoRow
                icon={<GraduationCap />}
                label="Education"
                value={employee.education}
                isLarge
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-blue-100/50 p-6">
            <h4 className="text-xs font-bold text-blue-900 uppercase flex items-center gap-2 mb-6 tracking-widest pb-3 border-b border-gray-50">
              <ShieldCheck className="h-4 w-4 text-primary" /> Verified Documents
            </h4>
            <div className="space-y-4">
              <DocumentRow name="VisaCopy_2025.pdf" size="2.4 MB" />
              <DocumentRow name="ID_Proof_Aadhar.pdf" size="1.2 MB" />
              <DocumentRow name="Joining_Letter.pdf" size="845 KB" />
            </div>
          </div>
        </div>

        {/* WORK INFO & ACTIVITY */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-blue-100/50 p-6">
            <h4 className="text-xs font-bold text-blue-900 uppercase flex items-center gap-2 mb-6 tracking-widest pb-3 border-b border-gray-50">
              <Briefcase className="h-4 w-4 text-primary" /> Employment Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-6">
                <InfoRow icon={<Calendar />} label="Joining Date" value={employee.joiningDate} />
                <InfoRow icon={<Briefcase />} label="Department" value={employee.department} />
                <InfoRow icon={<Calendar />} label="Probation End" value="15 Apr 2023" />
              </div>
              <div className="space-y-6">
                <InfoRow
                  icon={<ShieldCheck />}
                  label="Visa Expiry"
                  value={employee.visaExpire}
                  isCritical
                />
                <InfoRow icon={<User />} label="Report To" value="Riyas (Manager)" />
                <InfoRow icon={<Calendar />} label="Last Promotion" value="N/A" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isLarge = false,
  isCritical = false,
}: {
  icon: React.ReactElement;
  label: string;
  value: string;
  isLarge?: boolean;
  isCritical?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 group">
      <div className="mt-1 p-2 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-primary group-hover:text-white transition-colors duration-200 *:h-4 *:w-4">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p
          className={`text-sm font-bold ${isCritical ? 'text-red-600' : 'text-gray-900'} ${isLarge ? 'leading-relaxed' : ''}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function DocumentRow({ name, size }: { name: string; size: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-50 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200 group">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <p className="text-xs font-bold text-gray-900 truncate max-w-[150px]">{name}</p>
          <p className="text-[10px] text-gray-400 font-bold">{size}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-blue-600 font-bold hover:bg-white shadow-sm ring-1 ring-blue-100"
      >
        VIEW
      </Button>
    </div>
  );
}
