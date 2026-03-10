import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UpdatePasswordForm } from './update-password-form'
import { ShieldAlert } from 'lucide-react'

export default async function UpdatePasswordPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Double check if they really need to reset, otherwise redirect to dashboard
    if (!user.user_metadata?.must_reset_password) {
        redirect('/dashboard')
    }

    return (
        <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 bg-white/5 p-8 rounded-2xl border border-white/10">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-4">
                        <ShieldAlert className="h-6 w-6 text-yellow-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        Atualização de Senha Necessária
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Por motivos de segurança, você precisa definir uma nova senha antes de continuar.
                    </p>
                </div>

                <UpdatePasswordForm />
            </div>
        </div>
    )
}
