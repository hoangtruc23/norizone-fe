"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/app/services/authService";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const user = authService.getCurrentUser();

        if (!user && pathname !== "/admin/login") {
            router.replace("/admin/login");
            return;
        }

        if (user && pathname === "/admin/login") {
            router.replace("/admin");
            return;
        }

        setReady(true);
    }, [pathname, router]);

    if (!ready) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 text-white">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 px-6 py-4 text-sm text-slate-300">
                    Đang kiểm tra quyền truy cập...
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
