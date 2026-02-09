import Link from 'next/link';
import { UserCog, Users, Briefcase } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const portals = [
  {
    title: 'Admin Portal',
    description: 'System configuration, user management, and high-level reports.',
    href: '/adminlogin',
    icon: UserCog,
    color: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900/20',
  },
  {
    title: 'Manager Portal',
    description: 'Oversee operations, approve requests, and manage teams.',
    href: '/login',
    icon: Briefcase,
    color: 'text-purple-600',
    bg: 'bg-purple-100 dark:bg-purple-900/20',
  },
  {
    title: 'Employee Portal',
    description: 'Access daily tasks, submit reports, and view schedule.',
    href: '/login',
    icon: Users,
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-900/20',
  },
];

export default function PortalSelect() {
  return (
    <div id="portals" className="bg-gray-50 py-16 sm:py-24 dark:bg-gray-800">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Select Your Portal
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Choose the appropriate portal to access your dashboard.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-lg grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
          {portals.map((portal) => (
            <Card
              key={portal.title}
              className="flex flex-col justify-between hover:shadow-lg transition-shadow duration-300 dark:bg-gray-900 dark:border-gray-700"
            >
              <CardHeader>
                <div
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${portal.bg} ${portal.color} mb-4`}
                >
                  <portal.icon className="h-8 w-8" />
                </div>
                <CardTitle className="text-center text-xl">{portal.title}</CardTitle>
                <CardDescription className="text-center">{portal.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-8">
                <Link href={portal.href} className="w-full">
                  <Button className="w-full" variant="outline">
                    Login as {portal.title.split(' ')[0]}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
