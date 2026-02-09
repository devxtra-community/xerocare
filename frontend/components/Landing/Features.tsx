import {
  BarChart3,
  Users,
  Settings,
  Printer,
  FileText,
  Truck,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const features = [
  {
    name: 'Advanced Analytics',
    description:
      'Gain deep insights into your business performance with real-time dashboards and reports.',
    icon: BarChart3,
  },
  {
    name: 'Customer Management',
    description: 'Track customer interactions, manage leads, and improve customer satisfaction.',
    icon: Users,
  },
  {
    name: 'Inventory Control',
    description:
      'Keep track of printer stock, spare parts, and consumables across multiple warehouses.',
    icon: Printer,
  },
  {
    name: 'Automated Invoicing',
    description: 'Generate and send invoices automatically. Manage recurring billing effortlessly.',
    icon: FileText,
  },
  {
    name: 'Logistics & Delivery',
    description:
      'Optimize delivery routes and track shipments in real-time for maximum efficiency.',
    icon: Truck,
  },
  {
    name: 'Role-Based Access',
    description:
      'Secure your data with granular permission settings for admins, managers, and employees.',
    icon: ShieldCheck,
  },
  {
    name: 'Fast & Reliable',
    description:
      'Built on modern tech stack for lightning-fast performance and 99.9% uptime reliability.',
    icon: Zap,
  },
  {
    name: 'Custom Workflows',
    description:
      'Tailor the system to your specific business processes with customizable workflows.',
    icon: Settings,
  },
];

export default function Features() {
  return (
    <div id="features" className="bg-white py-16 sm:py-24 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-primary">Everything you need</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Complete Control Over Your Business
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            XeroCare provides a unified platform to manage every aspect of your printer business,
            from aquisition to maintenance and billing.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-2xl sm:mt-16 lg:mt-20 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-12">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                    <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">
                  {feature.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
