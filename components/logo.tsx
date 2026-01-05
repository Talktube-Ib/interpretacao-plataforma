import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
    return (
        <Link href="/dashboard" className={cn("relative flex items-center justify-center transition-opacity hover:opacity-90", className)}>
            <Image
                src="/logos/logo4.png"
                alt="TalkTube Logo"
                width={160}
                height={50}
                className="w-auto h-12 object-contain"
                priority
            />
        </Link>
    )
}
