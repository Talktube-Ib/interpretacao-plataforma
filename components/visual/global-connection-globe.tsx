"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Points, PointMaterial, Float, Sphere } from "@react-three/drei"
import * as THREE from "three"

function GlobePoints() {
    const ref = useRef<THREE.Points>(null)

    // Generate random points on a sphere surface for a "data globe" look
    const points = useMemo(() => {
        const p = new Float32Array(2000 * 3)
        for (let i = 0; i < 2000; i++) {
            // Using a simple deterministic pseudo-random or just fixed Math.random in useMemo (ok for client)
            const u = Math.random()
            const v = Math.random()
            const theta = 2 * Math.PI * u
            const phi = Math.acos(2 * v - 1)
            const r = 2.5 // Radius

            p[i * 3] = r * Math.sin(phi) * Math.cos(theta)
            p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
            p[i * 3 + 2] = r * Math.cos(phi)
        }
        return p
    }, [])

    useFrame((_state) => {
        if (ref.current) {
            ref.current.rotation.y += 0.002
            ref.current.rotation.x += 0.001
        }
    })

    if (typeof window === 'undefined') return null;

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={points} stride={3} frustumCulled={false}>
                <PointMaterial
                    transparent
                    color="#06b6d4" // Electric Cyan
                    size={0.05}
                    sizeAttenuation={true}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </Points>
            <Sphere args={[2.48, 64, 64]}>
                <meshPhongMaterial
                    color="#083344"
                    transparent
                    opacity={0.1}
                    wireframe
                />
            </Sphere>
        </group>
    )
}

export function GlobalConnectionGlobe() {
    return (
        <div className="w-full h-full min-h-[400px] md:min-h-[600px] absolute inset-0 -z-10 opacity-50 overflow-hidden pointer-events-none">
            <Canvas
                camera={{ position: [0, 0, 8], fov: 45 }}
                dpr={[1, 2]} // Optimize for high DPI screens
                gl={{ antialias: false, powerPreference: "high-performance" }} // Favor performance
            >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#06b6d4" />
                <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                    <GlobePoints />
                </Float>
            </Canvas>
        </div>
    )
}
