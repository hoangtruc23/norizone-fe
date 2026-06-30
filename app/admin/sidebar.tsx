"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, ReceiptText, Menu } from 'lucide-react'; // Đổi icon Users thành ReceiptText (Hóa đơn) cho đúng ngữ nghĩa

function Sidebar() {
    const pathname = usePathname(); // Lấy đường dẫn URL hiện tại

    const menuItems = [
        { icon: <LayoutDashboard size={18} />, label: "Dashboard", href: "/admin" },
        { icon: <LayoutDashboard size={18} />, label: "Booking", href: "/admin" },
        { icon: <ReceiptText size={18} />, label: "Hóa đơn", href: "/admin/invoice" },
        { icon: <Menu size={18} />, label: "Menu", href: "/admin/menu" },
        { icon: <Settings size={18} />, label: "Cài đặt hệ thống", href: "/admin/settings" },
    ];

    return (
        <nav className="p-3 flex flex-col gap-1">
            {menuItems.map(({ icon, label, href }) => {
                // Tự động kiểm tra xem item này có đang được active hay không
                const isActive = pathname === href;

                return (
                    <Link
                        key={label}
                        href={href}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${isActive
                            ? "bg-indigo-50 text-indigo-600 font-semibold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                    >
                        <span className={isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"}>
                            {icon}
                        </span>
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}

export default Sidebar;