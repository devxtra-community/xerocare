import Image from 'next/image';
import { AdminLoginForm } from '@/components/AdminLoginform';

export default function AdminLoginPage() {
  return (
    <>
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs">
              <AdminLoginForm />
            </div>
          </div>
        </div>

        <div className="bg-muted relative hidden lg:block">
          <Image
            src="/office-login.png"
            alt="Modern Office Environment"
            fill
            loading="eager" // LCP optimization
            sizes="50vw" // Since it takes up half the width on large screens
            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          />
        </div>
      </div>
    </>
  );
}
