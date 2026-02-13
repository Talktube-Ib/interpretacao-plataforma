
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

    const { pathname } = request.nextUrl

    // 1. Bypass heavy checks for non-protected routes
    const isProtectedRoute =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/room') ||
        pathname.startsWith('/update-password')

    if (!isProtectedRoute) {
        // Apply security headers and return FAST (ZERO network calls)
        response.headers.set('X-Frame-Options', 'DENY')
        response.headers.set('X-Content-Type-Options', 'nosniff')
        return response
    }

    // 2. Auth & Profile (Only for protected routes)
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 3. Status/Ban Check (Only for logged-in users on sensitive routes)
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('status, role')
            .eq('id', user.id)
            .single()

        if (error || !profile || profile.status !== 'active') {
            const redirectUrl = new URL('/login', request.url)
            redirectUrl.searchParams.set('error', !profile || profile?.status !== 'active' ? 'account_locked' : 'access_denied')
            if (profile?.status) redirectUrl.searchParams.set('status', profile.status)

            const ripResponse = NextResponse.redirect(redirectUrl)

            // Delete all possible Supabase cookie names to force logout
            const cookieNames = [
                'sb-access-token',
                'sb-refresh-token',
                `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0].split('//')[1]}-auth-token`,
                'supabase-auth-token'
            ]

            cookieNames.forEach(name => ripResponse.cookies.delete(name))
            return ripResponse
        }

        // Admin check
        if (pathname.startsWith('/admin') && profile.role !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    } catch (err) {
        console.error("Middleware profile check error:", err)
        // If DB is down but user is authed, we might want to allow dashboard read-only or 
        // redirect to a "temporarily unavailable" page. For now, let's redirect to login with a timeout error.
        const errorUrl = new URL('/login', request.url)
        errorUrl.searchParams.set('error', 'connection_timeout')
        return NextResponse.redirect(errorUrl)
    }

    // 4. Force Password Reset
    if (user.user_metadata?.must_reset_password && !pathname.startsWith('/update-password')) {
        return NextResponse.redirect(new URL('/update-password', request.url))
    }


    // 5. Security Headers for protected routes
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Permissions-Policy', "camera=(self), microphone=(self), geolocation=()")

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images/logos (static assets)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|logos|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
