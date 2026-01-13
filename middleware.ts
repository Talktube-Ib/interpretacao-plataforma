
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

    const {
        data: { user },
    } = await supabase.auth.getUser()



    // 1. RBAC & Basic Protection
    // Allow if user is logged in
    if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (!user && request.nextUrl.pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 2. Real-time Status Enforcement (Global Kill Switch)
    if (user) {
        // We fetch the profile to check for bans/suspensions
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('status, role')
            .eq('id', user.id)
            .single()

        // CRITICAL: If profile is missing or error (e.g. RLS block), treating as "Account Invalid"
        // This prevents banned users from accessing if RLS blocks their profile read
        if (error || !profile) {
            const redirectUrl = new URL('/login', request.url)
            redirectUrl.searchParams.set('error', 'access_denied')

            response = NextResponse.redirect(redirectUrl)
            // Force logout
            response.cookies.delete('sb-access-token')
            response.cookies.delete('sb-refresh-token')
            return response
        }

        if (profile) {
            // Block non-admins from /admin
            if (request.nextUrl.pathname.startsWith('/admin') && profile.role !== 'admin') {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }

            // Global ban enforcement
            if (profile.status !== 'active') {
                const redirectUrl = new URL('/login', request.url)
                redirectUrl.searchParams.set('error', 'account_locked')
                redirectUrl.searchParams.set('status', profile.status)

                // Clear cookies to effectively log them out
                response = NextResponse.redirect(redirectUrl)
                response.cookies.delete('sb-access-token')
                response.cookies.delete('sb-refresh-token')
                return response
            }
        }

        // 3. Force Password Reset
        if (
            user.user_metadata?.must_reset_password &&
            !request.nextUrl.pathname.startsWith('/update-password') &&
            !request.nextUrl.pathname.startsWith('/auth') // Allow auth related routes e.g. logout
        ) {
            return NextResponse.redirect(new URL('/update-password', request.url))
        }
    }

    if (user && request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
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
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
