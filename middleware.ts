
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
    if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (!user && request.nextUrl.pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 2. Real-time Status Enforcement (Global Kill Switch)
    if (user) {
        // We fetch the profile to check for bans/suspensions
        const { data: profile } = await supabase
            .from('profiles')
            .select('status, role')
            .eq('id', user.id)
            .single()

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
    }

    if (user && request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

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
