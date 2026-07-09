import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  userId: string;
  role: 'HR' | 'EMPLOYEE' | 'FINANCE' | 'MANAGER' | 'ADMIN';
  exp: number;
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define protected routes and their allowed roles.
  // MANAGER has branch-wide authority: full access to HR, employee and finance sections.
  const protectedRoutes = [
    { path: '/admin', roles: ['ADMIN'] },
    { path: '/hr', roles: ['HR', 'MANAGER'] },
    { path: '/manager', roles: ['MANAGER'] },
    { path: '/employee', roles: ['EMPLOYEE', 'MANAGER'] },
    { path: '/finance', roles: ['FINANCE', 'MANAGER'] },
    // Add more as needed
  ];

  // Check if the current path is protected
  const protectedRoute = protectedRoutes.find((route) => path.startsWith(route.path));

  // Token is stored in localStorage by the frontend, so it won't be in cookies
  // for most users. The middleware provides a best-effort server-side check;
  // actual enforcement is handled by client-side role guards and backend JWT auth.
  const token = request.cookies.get('accessToken')?.value;

  if (protectedRoute) {
    // ── ACCOUNTS ACCESS — block HR/EMPLOYEE from any /accounts path ────────────
    if (path.includes('/accounts')) {
      if (!token) {
        // No cookie token — redirect to appropriate login (client guard will also catch this)
        if (path.startsWith('/admin')) {
          return NextResponse.redirect(new URL('/adminlogin', request.url));
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }

      try {
        const decoded = jwtDecode<JwtPayload>(token);
        const role = decoded.role;

        // HR and EMPLOYEE have zero accounts access
        if (role === 'HR' || role === 'EMPLOYEE') {
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }

        // Finance accounts → must be FINANCE
        if (
          path.startsWith('/finance/accounts') ||
          path.startsWith('/finance/(dashboard)/accounts')
        ) {
          if (role === 'MANAGER') {
            return NextResponse.redirect(new URL('/manager/accounts', request.url));
          }
          if (role === 'ADMIN') {
            return NextResponse.redirect(new URL('/admin/accounts', request.url));
          }
        }

        // Manager accounts → MANAGER or ADMIN only
        if (path.startsWith('/manager/accounts')) {
          if (role !== 'MANAGER' && role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
          }
        }

        // Admin accounts → ADMIN only
        if (path.startsWith('/admin/accounts')) {
          if (role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
          }
        }
      } catch {
        // Invalid token
        if (path.startsWith('/admin')) {
          return NextResponse.redirect(new URL('/adminlogin', request.url));
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }

  // ── ROLE-BASED SECTION ACCESS ───────────────────────────────────────────────
  if (protectedRoute) {
    if (!token) {
      if (path.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/adminlogin', request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);

      if (!protectedRoute.roles.includes(decoded.role)) {
        if (decoded.role === 'ADMIN') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        } else if (decoded.role === 'HR') {
          return NextResponse.redirect(new URL('/hr/dashboard', request.url));
        } else if (decoded.role === 'MANAGER') {
          return NextResponse.redirect(new URL('/manager/dashboard', request.url));
        } else if (decoded.role === 'EMPLOYEE') {
          return NextResponse.redirect(new URL('/employee/dashboard', request.url));
        } else if (decoded.role === 'FINANCE') {
          return NextResponse.redirect(new URL('/finance/dashboard', request.url));
        } else {
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
      }
    } catch {
      if (path.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/adminlogin', request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/hr/:path*',
    '/manager/:path*',
    '/employee/:path*',
    '/finance/:path*',
  ],
};
