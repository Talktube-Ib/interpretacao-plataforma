
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    // 1. Get User Session (Fastest way to check if auth exists)
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl

    // 2. Public Routes Bypass (Do not run heavy DB checks here)
    const isPublicRoute = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/auth')
    const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/room')

    // If no user and trying to access protected route -> Redirect to login
    if (!user && isProtectedRoute) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // If user is logged in and tries to access login/signup -> Dashboard
    if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // 3. Heavy Profile Check (Only for logged-in users on protected routes)
    if (user && isProtectedRoute) {
        // We fetch the profile to check for bans/suspensions
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('status, role')
            .eq('id', user.id)
            .single()

        if (error || !profile) {
            const redirectUrl = new URL('/login', request.url)
            redirectUrl.searchParams.set('error', 'access_denied')
            response = NextResponse.redirect(redirectUrl)
            response.cookies.delete('sb-access-token')
            response.cookies.delete('sb-refresh-token')
            return response
        }

        // Role-based access for /admin
        if (pathname.startsWith('/admin') && profile.role !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // Global ban enforcement
        if (profile.status !== 'active') {
            const redirectUrl = new URL('/login', request.url)
            redirectUrl.searchParams.set('error', 'account_locked')
            response = NextResponse.redirect(redirectUrl)
            response.cookies.delete('sb-access-token')
            response.cookies.delete('sb-refresh-token')
            return response
        }

        // Force Password Reset check
        if (user.user_metadata?.must_reset_password && !pathname.startsWith('/update-password')) {
            return NextResponse.redirect(new URL('/update-password', request.url))
        }
    }

    // 4. Security Headers
    response.headers.set('X-Frame-Options', 'DENY') // Prevent Clickjacking
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data: https: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'none';")
    response.headers.set('Permissions-Policy', "camera=(), microphone=(), geolocation=()") // Default deny, RoomPage overrides? No, Middleware headers are usually additive or global. 
    // Wait, RoomPage NEEDS Camera/Mic. 
    // Permissions-Policy in middleware applies to the PAGE. 
    // If we set camera=(), functionality will BREAK.
    // Let's set it to allow self for now, or omit if strictly managed by browser prompt.
    response.headers.set('Permissions-Policy', "camera=(self), microphone=(self), geolocation=()")

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api (api routes)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
