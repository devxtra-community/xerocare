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
    <div className="min-h-screen bg-gray-50/50 p-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-white"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white text-xl font-medium shadow-sm">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary flex items-center gap-3">
                {employee.name}
                <span className="px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 font-medium border border-green-100">
                  {employee.status}
                </span>
              </h3>
              <p className="text-sm text-gray-500">
                {employee.role} &middot; {employee.department}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white gap-2 h-9 font-medium px-4">
            <Mail className="h-4 w-4" /> Message
          </Button>
          <Button className="gap-2 h-9 font-medium px-4">Edit Profile</Button>
        </div>
      </div>

      {/* DETAILED INFO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PERSONAL INFO */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-6 pb-3 border-b border-gray-100">
              <User className="h-4 w-4 text-gray-500" /> Personal Information
            </h4>
            <div className="space-y-5">
              <InfoRow icon={<Mail />} label="Email" value={employee.email} isCritical />
              <InfoRow icon={<Phone />} label="Phone" value={employee.phone} />
              <InfoRow icon={<MapPin />} label="Address" value={employee.address} />
              <InfoRow icon={<GraduationCap />} label="Education" value={employee.education} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-6 pb-3 border-b border-gray-100">
              <ShieldCheck className="h-4 w-4 text-gray-500" /> Documents
            </h4>
            <div className="space-y-3">
              <DocumentRow name="VisaCopy_2025.pdf" size="2.4 MB" />
              <DocumentRow name="ID_Proof_Aadhar.pdf" size="1.2 MB" />
              <DocumentRow name="Joining_Letter.pdf" size="845 KB" />
            </div>
          </div>
        </div>

        {/* WORK INFO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-6 pb-3 border-b border-gray-100">
              <Briefcase className="h-4 w-4 text-gray-500" /> Employment Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-6">
                <InfoRow
                  icon={<Calendar />}
                  label="Joining Date"
                  value={employee.joiningDate}
                  isCritical
                />
                <InfoRow
                  icon={<Briefcase />}
                  label="Department"
                  value={employee.department}
                  isCritical
                />
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
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className={`text-sm font-medium ${isCritical ? 'text-primary' : 'text-gray-900'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function DocumentRow({ name, size }: { name: string; size: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 bg-gray-100 text-gray-500 rounded flex items-center justify-center">
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{name}</p>
          <p className="text-xs text-gray-500">{size}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-primary hover:text-primary hover:bg-transparent px-2 h-8"
      >
        View
      </Button>
    </div>
  );
}
