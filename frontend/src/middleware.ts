import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== '/trade') return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/trade-v2';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/trade'],
};
