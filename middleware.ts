import { stackServerApp } from "@/stack"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const user = await stackServerApp.getUser()

  // Protect chat routes
  if (request.nextUrl.pathname.startsWith("/chat") && !user) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // Redirect authenticated users away from auth pages
  if (
    user &&
    request.nextUrl.pathname.startsWith("/auth/signin") // Removed signup redirect check since signup page no longer exists
  ) {
    return NextResponse.redirect(new URL("/chat", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
