
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    console.log(`[Middleware] Path: ${request.nextUrl.pathname}`)
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
        pathname.startsWith('/atualizar-senha')

    if (!isProtectedRoute) {
        console.log(`[Middleware] Public route, bypassing checks`)
        // Apply security headers and return FAST (ZERO network calls)
        response.headers.set('X-Frame-Options', 'DENY')
        response.headers.set('X-Content-Type-Options', 'nosniff')
        response.headers.set('X-XSS-Protection', '1; mode=block')
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
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
            .maybeSingle()

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

        // Admin check (Include MASTER as admin)
        const isAdmin = profile.role === 'admin' || profile.role === 'MASTER'
        if (pathname.startsWith('/admin') && !isAdmin) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    } catch (err) {
        console.error("CRITICAL MIDDLEWARE ERROR:", err)
        // Check if it's a Supabase connection error
        const errorMessage = err instanceof Error ? err.message : String(err)
        
        const errorUrl = new URL('/login', request.url)
        if (errorMessage.includes('fetch failed') || errorMessage.includes('network')) {
            errorUrl.searchParams.set('error', 'connection_timeout')
        } else {
            errorUrl.searchParams.set('error', 'internal_server_error')
        }
        return NextResponse.redirect(errorUrl)
    }

    // 4. Force Password Reset
    if (user.user_metadata?.must_reset_password && !pathname.startsWith('/atualizar-senha')) {
        return NextResponse.redirect(new URL('/atualizar-senha', request.url))
    }


    // 5. Security Headers for protected routes
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
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
         * - public folder assets (logos, images, assets)
         * - all files with common extensions
         */
        '/((?!api|_next/static|_next/image|favicon.ico|logos|images|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
}
