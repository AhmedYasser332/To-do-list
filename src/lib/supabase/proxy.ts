import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from './config';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { url, publishableKey } = getSupabaseConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Verify identity using getClaims() per official guidance
  let user = null;
  try {
    const { data: claimsData } = await supabase.auth.getClaims();
    user = claimsData?.claims;
  } catch {
    user = null;
  }

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith('/login');
  const isPublicRoute =
    isAuthRoute ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.');

  // Protect planner routes: if no authenticated user, redirect to /login
  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  // If user is authenticated and visits /login, redirect to /today
  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/today';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
