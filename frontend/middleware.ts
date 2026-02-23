import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

// Define the shape of the JWT payload
interface JwtPayload {
  id: string;
  role: 'HR' | 'EMPLOYEE' | 'FINANCE' | 'MANAGER' | 'ADMIN';
  exp: number;
}

export function middleware(request: NextRequest) {
  // Get the path
  const path = request.nextUrl.pathname;

  // Define protected routes and their allowed roles
  const protectedRoutes = [
    { path: '/admin', roles: ['ADMIN'] },
    { path: '/hr', roles: ['HR'] },
    { path: '/manager', roles: ['MANAGER'] },
    { path: '/employee', roles: ['EMPLOYEE'] },
    // Add more as needed
  ];

  // Check if the current path is protected
  const protectedRoute = protectedRoutes.find((route) => path.startsWith(route.path));

  if (protectedRoute) {
    // Get the token from cookies
    const token = request.cookies.get('accessToken')?.value;

    if (!token) {
      // Redirect to login if no token
      if (path.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/adminlogin', request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // Decode the token
      const decoded = jwtDecode<JwtPayload>(token);

      // Check if the user has the required role
      if (!protectedRoute.roles.includes(decoded.role)) {
        // Redirect to unauthorized page or dashboard if role doesn't match
        // For now, let's redirect to their appropriate dashboard or home
        if (decoded.role === 'ADMIN') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        } else if (decoded.role === 'HR') {
          return NextResponse.redirect(new URL('/hr/dashboard', request.url));
        } else if (decoded.role === 'MANAGER') {
          return NextResponse.redirect(new URL('/manager/dashboard', request.url));
        } else if (decoded.role === 'EMPLOYEE') {
          return NextResponse.redirect(new URL('/employee/dashboard', request.url));
        } else {
          return NextResponse.redirect(new URL('/', request.url)); // Or /unauthorized
        }
      }
    } catch {
      // If token is invalid, redirect to login
      if (path.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/adminlogin', request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/hr/:path*', '/manager/:path*', '/employee/:path*'],
};
