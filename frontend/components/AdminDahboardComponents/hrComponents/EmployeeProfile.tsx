'use client';

import React from 'react';
import { 
  ArrowLeft, 
  Mail, 
  MapPin, 
  Briefcase, 
  Calendar, 
  User, 
  Building,
  ShieldCheck,
  Phone,
  Clock,
  CircleDollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface EmployeeProfileProps {
  id: string;
}

const mockEmployeeDetail = {
  id: 'EMP001',
  name: 'John Doe',
  email: 'john.doe@xerocare.com',
  phone: '+971 50 123 4567',
  role: 'Senior Software Engineer',
  department: 'Engineering',
  branch: 'Dubai Main',
  location: 'Sheikh Zayed Road, Dubai',
  type: 'Full-time',
  status: 'Active',
  joiningDate: 'January 15, 2023',
  manager: 'Sarah Wilson',
  salary: 'AED 15,000',
  shift: '9:00 AM - 6:00 PM',
  bio: 'Experienced software engineer specialized in full-stack development with a focus on React and Node.js. John has been a key contributor to our core platform since joining.',
  permissions: ['Admin Dashboard', 'Sales Management', 'Inventory Access', 'HR View Only'],
};

export default function EmployeeProfile({ id }: EmployeeProfileProps) {
  const router = useRouter();
  
  // In a real app, you would fetch employee details by ID here
  const emp = mockEmployeeDetail;

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
          <p className="text-sm text-gray-500">Viewing details for {id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-3xl mb-4">
              {emp.name.charAt(0)}
            </div>
            <h3 className="text-xl font-bold text-gray-900">{emp.name}</h3>
            <p className="text-sm text-primary font-medium">{emp.role}</p>
            <Badge 
              variant="outline" 
              className="mt-3 bg-green-100 text-green-700 border-none px-3 py-1"
            >
              {emp.status}
            </Badge>

            <div className="w-full mt-6 pt-6 border-t border-gray-100 space-y-4 text-left">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{emp.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{emp.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{emp.location}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-4">Account Permissions</h4>
            <div className="flex flex-wrap gap-2">
              {emp.permissions.map((perm, idx) => (
                <Badge key={idx} variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none">
                  {perm}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h4 className="text-lg font-bold text-blue-900 mb-6 border-b pb-4">Employment Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Role / Title</p>
                  <p className="text-sm font-semibold text-gray-900">{emp.role}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Building className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Department</p>
                  <p className="text-sm font-semibold text-gray-900">{emp.department}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Branch</p>
                  <p className="text-sm font-semibold text-gray-900">{emp.branch}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Reporting Manager</p>
                  <p className="text-sm font-semibold text-gray-900">{emp.manager}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Joining Date</p>
                  <p className="text-sm font-semibold text-gray-900">{emp.joiningDate}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Employment Type</p>
                  <p className="text-sm font-semibold text-gray-900">{emp.type}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <CircleDollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Salary / Package</p>
                  <p className="text-sm font-semibold text-gray-900">{emp.salary}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Working Hours</p>
                  <p className="text-sm font-semibold text-gray-900">{emp.shift}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100">
              <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2">Professional Summary</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {emp.bio}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
