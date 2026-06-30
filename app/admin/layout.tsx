"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";
import AdminGuard from "./AdminGuard";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLoginPage = pathname === "/admin/login";

    if (isLoginPage) {
        return <AdminGuard>{children}</AdminGuard>;
    }

    return (
        <AdminGuard>
            <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-indigo-500/10">
                <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between sticky top-0 h-screen z-50 overflow-y-auto">                    <div>
                    <div className="px-6 py-5 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-base shadow-sm">
                                N
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-900 tracking-wide">NORI ZONE</div>
                                <div className="text-[10px] text-indigo-600 font-bold tracking-wider uppercase">Management Hub</div>
                            </div>
                        </div>
                    </div>

                    <Sidebar />
                </div>
                </aside>

                <div className="flex-1 flex flex-col min-w-0">
                    {children}
                </div>
            </div>
        </AdminGuard>
    );
}