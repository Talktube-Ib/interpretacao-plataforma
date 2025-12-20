'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Upload } from 'lucide-react'

interface AvatarUploadProps {
    uid: string
    url: string | null
    email: string
    onUploadComplete: (url: string) => void
}

export default function AvatarUpload({ uid, url, email, onUploadComplete }: AvatarUploadProps) {
    const supabase = createClient()
    const [avatarUrl, setAvatarUrl] = useState<string | null>(url)
    const [uploading, setUploading] = useState(false)

    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Selecione uma imagem para fazer upload.')
            }

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const filePath = `${uid}-${Math.random()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Update Database
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', uid)

            if (updateError) {
                throw updateError
            }

            setAvatarUrl(publicUrl)
            onUploadComplete(publicUrl)
        } catch (error: any) {
            alert('Erro ao fazer upload da imagem: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="flex items-center gap-6 mb-8 p-6 bg-accent/20 rounded-3xl border border-border">
            <Avatar className="h-20 w-20 rounded-3xl border-2 border-white/20 shadow-xl">
                <AvatarImage src={avatarUrl || ''} className="object-cover" />
                <AvatarFallback className="rounded-3xl bg-gradient-to-br from-[#06b6d4] to-blue-600 font-black text-3xl text-white">
                    {email?.[0].toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
                <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">Avatar</span>
                <div className="relative">
                    <input
                        type="file"
                        id="single"
                        accept="image/*"
                        onChange={uploadAvatar}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-background border-border rounded-xl hover:bg-[#06b6d4]/20 hover:text-[#06b6d4] transition-all pointer-events-none"
                    >
                        {uploading ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                        ) : (
                            <><Upload className="h-4 w-4 mr-2" /> Alterar Imagem</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
