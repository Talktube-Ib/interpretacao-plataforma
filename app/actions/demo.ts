'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function startDemoMode() {
    const cookieStore = await cookies()

    // Set a cookie that expires in 1 hour
    cookieStore.set('demo_mode', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1 hour
        path: '/'
    })

    redirect('/dashboard')
}

export async function exitDemoMode() {
    const cookieStore = await cookies()
    cookieStore.delete('demo_mode')
    redirect('/')
}
