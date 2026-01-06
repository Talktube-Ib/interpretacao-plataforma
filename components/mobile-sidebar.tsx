"use client"

import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface MobileSidebarProps {
    user: any;
    userRole: string;
    userAvatar?: string | null;
    userName?: string;
}

export const MobileSidebar = ({ user, userRole, userAvatar, userName }: MobileSidebarProps) => {
    const [isMounted, setIsMounted] = useState(false);
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    if (!isMounted) {
        return null;
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6 text-foreground" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-transparent border-none w-72">
                <Sidebar user={user} userRole={userRole} userAvatar={userAvatar} userName={userName} />
            </SheetContent>
        </Sheet>
    );
};
