import { useState, useRef, useEffect, useCallback } from 'react'

export interface MediaStreamConfig {
    micOn?: boolean
    cameraOn?: boolean
    audioDeviceId?: string
    videoDeviceId?: string
    stream?: MediaStream
}

export function useMediaStream(config: MediaStreamConfig = {}, isJoined: boolean = false) {
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Refs to keep track of current tracks to avoid stale closures
    const currentAudioTrackRef = useRef<MediaStreamTrack | null>(null)
    const currentVideoTrackRef = useRef<MediaStreamTrack | null>(null)

    // Initialize stream
    useEffect(() => {
        let mounted = true
        let activeStream: MediaStream | null = null

        const init = async () => {
            if (!isJoined) return

            try {
                if (config.stream) {
                    activeStream = config.stream
                } else {
                    const constraints = {
                        audio: config.micOn !== false ? { deviceId: config.audioDeviceId ? { exact: config.audioDeviceId } : undefined } : true,
                        video: config.cameraOn !== false ? { deviceId: config.videoDeviceId ? { exact: config.videoDeviceId } : undefined } : true
                    }
                    activeStream = await navigator.mediaDevices.getUserMedia(constraints)
                }

                if (!mounted) {
                    activeStream.getTracks().forEach(t => t.stop())
                    return
                }

                // Initial mute state
                if (config.micOn === false) activeStream.getAudioTracks().forEach(t => t.enabled = false)
                if (config.cameraOn === false) activeStream.getVideoTracks().forEach(t => t.enabled = false)

                currentAudioTrackRef.current = activeStream.getAudioTracks()[0] || null
                currentVideoTrackRef.current = activeStream.getVideoTracks()[0] || null

                setStream(activeStream)
                setError(null)
            } catch (err: any) {
                if (mounted) setError(err.message)
            }
        }

        init()

        return () => {
            mounted = false
            // Only stop tracks if we created the stream (not passed in config)
            if (activeStream && !config.stream) {
                activeStream.getTracks().forEach(t => t.stop())
            }
        }
    }, [isJoined, config.audioDeviceId, config.videoDeviceId, config.stream])

    const toggleMic = useCallback((enabled: boolean) => {
        if (stream) {
            stream.getAudioTracks().forEach(t => t.enabled = enabled)
        }
    }, [stream])

    const toggleCamera = useCallback((enabled: boolean) => {
        if (stream) {
            stream.getVideoTracks().forEach(t => t.enabled = enabled)
        }
    }, [stream])

    const switchDevice = useCallback(async (kind: 'audio' | 'video', deviceId: string) => {
        if (!stream) return

        try {
            const constraints = kind === 'audio'
                ? { audio: { deviceId: { exact: deviceId } } }
                : { video: { deviceId: { exact: deviceId } } }

            const newStream = await navigator.mediaDevices.getUserMedia(constraints)
            const newTrack = kind === 'audio' ? newStream.getAudioTracks()[0] : newStream.getVideoTracks()[0]

            const oldTrack = kind === 'audio' ? currentAudioTrackRef.current : currentVideoTrackRef.current

            if (oldTrack) {
                stream.removeTrack(oldTrack)
                oldTrack.stop()
            }

            stream.addTrack(newTrack)

            if (kind === 'audio') currentAudioTrackRef.current = newTrack
            else currentVideoTrackRef.current = newTrack

            // Notify caller that track changed (useful for renegotiation if needed)
            return newTrack
        } catch (err) {
            console.error(`Failed to switch ${kind} device:`, err)
            throw err
        }
    }, [stream])

    return {
        stream,
        error,
        toggleMic,
        toggleCamera,
        switchDevice
    }
}
