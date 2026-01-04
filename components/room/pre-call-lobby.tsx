'use client'
import { Button } from '@/components/ui/button'

export function PreCallLobby(props: any) {
    return (
        <div className="h-screen w-full flex items-center justify-center bg-black text-white">
            <div className="max-w-md w-full p-8 text-center bg-zinc-900 rounded-2xl border border-zinc-800">
                <h1 className="text-2xl font-bold mb-4">Lobby</h1>
                <p className="mb-8 text-zinc-400">Please waiting while we set things up.</p>
                <Button
                    onClick={() => props.onJoin({
                        micOn: true,
                        cameraOn: true,
                        name: props.userName,
                        audioDeviceId: 'default',
                        videoDeviceId: 'default'
                    })}
                    className="w-full"
                >
                    Join Meeting
                </Button>
            </div>
        </div>
    )
}
