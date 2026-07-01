"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ReceiptText, Menu, LogOut } from 'lucide-react';
import { authService } from '@/app/services/authService';

function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('nori_auth_user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setUserRole(parsedUser.role);
            } catch (error) {
                console.error("Lỗi parse thông tin user:", error);
            }
        }
    }, []);

    const allMenuItems = [
        { icon: <LayoutDashboard size={18} />, label: "Booking", href: "/admin" },
        { icon: <ReceiptText size={18} />, label: "Hóa đơn", href: "/admin/invoice" },
        { icon: <Menu size={18} />, label: "Menu", href: "/admin/menu" },
        // { icon: <Settings size={18} />, label: "Cài đặt hệ thống", href: "/admin/settings" },
    ];

    const filteredMenuItems = allMenuItems.filter(item => {
        if (userRole === "staff" && item.label === "Hóa đơn") {
            return false;
        }
        return true;
    });

    return (
        <div className="flex flex-col justify-between h-full lg:h-[calc(100vh-77px)] p-4">
            {/* Khung chứa các Menu Items */}
            <nav className="flex flex-col gap-1.5">
                {filteredMenuItems.map(({ icon, label, href }) => {
                    const isActive = pathname === href;

                    return (
                        <Link
                            key={label}
                            href={href}
                            className={`relative flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                                ? "bg-indigo-50/70 text-indigo-600 font-semibold shadow-sm shadow-indigo-100/50"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                        >
                            {isActive && (
                                <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-indigo-600 rounded-r-full" />
                            )}

                            <span className={`transition-colors duration-150 ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                                }`}>
                                {icon}
                            </span>
                            {label}
                        </Link>
                    );
                })}
            </nav>

            {/* Nút Đăng xuất nằm dưới đáy Sidebar */}
            <div className="pt-4 border-t border-slate-100">
                <button
                    onClick={() => {
                        authService.logout();
                        router.replace("/admin/login");
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50/60 hover:text-rose-700 transition-all duration-150 cursor-pointer group"
                >
                    <span className="text-rose-400 group-hover:text-rose-500 transition-colors">
                        <LogOut size={18} />
                    </span>
                    Đăng xuất
                </button>
            </div>
        </div>
    );
}

export default Sidebar;