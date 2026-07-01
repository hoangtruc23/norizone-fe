"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Sidebar from "./sidebar";
import AdminGuard from "./AdminGuard";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLoginPage = pathname === "/admin/login";
    const [drawerOpen, setDrawerOpen] = useState(false);

    if (isLoginPage) {
        return <AdminGuard>{children}</AdminGuard>;
    }

    return (
        <AdminGuard>
            <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-indigo-500/10">
                {/* ── SIDEBAR: cố định trên desktop (lg+), ẩn trên mobile ── */}
                <aside className="hidden lg:flex w-64 shrink-0 bg-white border-r border-slate-200 flex-col justify-between sticky top-0 h-screen z-50 overflow-y-auto">
                    <div>
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

                {/* ── DRAWER SIDEBAR: hiện trên mobile khi bấm menu ── */}
                {drawerOpen && (
                    <div className="lg:hidden fixed inset-0 z-[60] flex">
                        {/* backdrop */}
                        <div
                            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
                            onClick={() => setDrawerOpen(false)}
                        />
                        {/* panel */}
                        <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-base shadow-sm">
                                        N
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 tracking-wide">NORI ZONE</div>
                                        <div className="text-[10px] text-indigo-600 font-bold tracking-wider uppercase">Management Hub</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDrawerOpen(false)}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 transition"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto" onClick={() => setDrawerOpen(false)}>
                                <Sidebar />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── NỘI DUNG CHÍNH ── */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Topbar mobile — chỉ hiện dưới lg, chứa nút mở drawer */}
                    <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 h-14 px-4 flex items-center gap-3">
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 active:scale-95 transition"
                        >
                            <Menu size={18} />
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 tracking-wide">NORI ZONE</span>
                        </div>
                    </div>

                    {children}
                </div>
            </div>
        </AdminGuard>
    );
}