"use client";
import React, { useState, useEffect } from "react";
import {
    Search, Receipt, Calendar, Clock, DollarSign,
    Eye, Printer, RefreshCw, ChevronRight, Utensils, Sparkles, X, Tag
} from "lucide-react";
import { invoiceService } from "@/app/services/invoiceService";

interface OrderedItem {
    name: string;
    quantity: number;
    priceAtOrder: number;
}

interface Invoice {
    _id: string;
    bookingId: {
        _id: string;
        customerName: string;
        customerPhone: string;
        roomId: { roomNumber: string; type: string };
    };
    actualHours: number;
    roomCharge: number;
    orderedItems: OrderedItem[];
    serviceCharge: number;
    discountAmount: number;
    totalAmount: number;
    paymentMethod: "cash" | "banking" | "momo";
    isPaid: boolean;
    createdAt: string;
}

const PAYMENT_METHOD_MAP: Record<string, { label: string; short: string; badge: string; bar: string; tint: string }> = {
    cash: { label: "Tiền mặt", short: "Tiền mặt", badge: "bg-slate-100 text-slate-700 border border-slate-200", bar: "bg-slate-400", tint: "bg-slate-50 text-slate-700" },
    banking: { label: "Chuyển khoản", short: "Chuyển khoản", badge: "bg-indigo-50 text-indigo-700 border border-indigo-100", bar: "bg-indigo-500", tint: "bg-indigo-50 text-indigo-700" },
    momo: { label: "Ví MoMo", short: "MoMo", badge: "bg-violet-50 text-violet-700 border border-violet-100", bar: "bg-violet-500", tint: "bg-violet-50 text-violet-700" },
};

const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

const SheetHandle = () => (
    <div className="flex justify-center pt-2.5 pb-1 shrink-0">
        <div className="w-9 h-1.5 rounded-full bg-slate-200" />
    </div>
);

export default function InvoiceManagement() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchOpen, setSearchOpen] = useState(false); // Dành riêng cho Mobile toggle
    const [filterMethod, setFilterMethod] = useState<"all" | Invoice["paymentMethod"]>("all");
    const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
    const [now, setNow] = useState(new Date());

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await invoiceService.getAll();
            setInvoices(res);
        } catch (error) {
            setInvoices([
                {
                    _id: "HD9481",
                    bookingId: { _id: "B1", customerName: "Nguyễn Minh Hoàng", customerPhone: "0901234567", roomId: { roomNumber: "Box S01", type: "Standard" } },
                    actualHours: 2.5,
                    roomCharge: 75000,
                    orderedItems: [{ name: "Coca Cola", quantity: 2, priceAtOrder: 20000 }],
                    serviceCharge: 40000,
                    discountAmount: 15000,
                    totalAmount: 100000,
                    paymentMethod: "banking",
                    isPaid: true,
                    createdAt: new Date().toISOString()
                },
                {
                    _id: "HD9482",
                    bookingId: { _id: "B2", customerName: "Trần Thanh Thúy", customerPhone: "0918888999", roomId: { roomNumber: "Box M03", type: "Premium" } },
                    actualHours: 1.2,
                    roomCharge: 50000,
                    orderedItems: [],
                    serviceCharge: 0,
                    discountAmount: 0,
                    totalAmount: 50000,
                    paymentMethod: "cash",
                    isPaid: true,
                    createdAt: new Date().toISOString()
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const filteredInvoices = invoices.filter(inv => {
        const name = inv.bookingId?.customerName?.toLowerCase() || "";
        const phone = inv.bookingId?.customerPhone || "";
        const id = inv._id?.toLowerCase() || "";
        const q = searchTerm.trim().toLowerCase();
        const matchSearch = !q || name.includes(q) || phone.includes(q) || id.includes(q);
        const matchMethod = filterMethod === "all" || inv.paymentMethod === filterMethod;
        return matchSearch && matchMethod;
    });

    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalService = filteredInvoices.reduce((sum, inv) => sum + inv.serviceCharge, 0);

    const FILTER_TABS: { key: "all" | Invoice["paymentMethod"]; label: string; count: number }[] = [
        { key: "all", label: "Tất cả", count: invoices.length },
        { key: "cash", label: "Tiền mặt", count: invoices.filter(i => i.paymentMethod === "cash").length },
        { key: "banking", label: "Chuyển khoản", count: invoices.filter(i => i.paymentMethod === "banking").length },
        { key: "momo", label: "MoMo", count: invoices.filter(i => i.paymentMethod === "momo").length },
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-indigo-500/10 pb-24 md:pb-6">

            {/* ═════════════════════════════════════════════════════════════
                1. DESKTOP HEADER VIEW (Ẩn trên mobile)
            ═════════════════════════════════════════════════════════════ */}
            <header className="hidden md:flex bg-white border-b border-slate-200 px-8 h-16 items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-600">NORI Workspace</span>
                    <ChevronRight size={14} className="text-slate-300" />
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 font-medium">
                        Quản lý hóa đơn
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm tên khách, số ĐT, mã..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>
                    <button
                        onClick={fetchInvoices}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-sm active:scale-95"
                    >
                        <RefreshCw size={14} className={`text-slate-500 ${loading ? "animate-spin text-indigo-600" : ""}`} />
                        Làm mới dữ liệu
                    </button>
                </div>
            </header>

            {/* ── MOBILE HEADER VIEW (Ẩn trên desktop) ── */}
            <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="px-4 h-14 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">Quản lý hóa đơn</h1>
                        <p className="text-[10px] text-slate-400 leading-tight">
                            Cập nhật lúc {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setSearchOpen(v => !v)}
                            className={`p-2.5 rounded-lg border transition-all active:scale-95 shadow-sm ${searchOpen ? "border-indigo-300 bg-indigo-50 text-indigo-600" : "border-slate-200 bg-white text-slate-500"}`}
                        >
                            <Search size={15} />
                        </button>
                        <button onClick={fetchInvoices} className="p-2.5 rounded-lg border border-slate-200 bg-white active:scale-95 transition-all shadow-sm">
                            <RefreshCw size={15} className={`text-slate-500 ${loading ? "animate-spin text-indigo-600" : ""}`} />
                        </button>
                    </div>
                </div>
                {searchOpen && (
                    <div className="px-4 pb-3 animate-in slide-in-from-top-2 fade-in duration-150">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Tìm tên khách, số ĐT, mã hóa đơn..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* ── MAIN CONTENT CONTAINER ── */}
            <main className="p-4 md:p-8 max-w-full w-full mx-auto space-y-4 md:space-y-6">

                {/* Counter Stats Grid (Đồng nhất kiến trúc) */}
                <div className="grid grid-cols-3 gap-2.5 md:gap-5">
                    {[
                        { label: "Doanh thu", value: totalRevenue.toLocaleString() + "đ", bar: "bg-indigo-500", tint: "bg-indigo-50 text-indigo-700", icon: DollarSign },
                        { label: "Tiền dịch vụ", value: totalService.toLocaleString() + "đ", bar: "bg-slate-400", tint: "bg-slate-100 text-slate-700", icon: Utensils },
                        { label: "Hóa đơn xong", value: `${filteredInvoices.length} đơn`, bar: "bg-emerald-500", tint: "bg-emerald-50 text-emerald-700", icon: Receipt },
                    ].map(({ label, value, bar, tint }) => (
                        <div key={label} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
                            <div className={`h-1 md:h-1.5 ${bar}`} />
                            <div className="p-3 md:p-5 flex items-center justify-between">
                                <div className="min-w-0">
                                    <div className="text-[10px] md:text-xs font-medium text-slate-400 tracking-wider uppercase truncate">{label}</div>
                                    <div className="text-sm md:text-2xl font-extrabold text-slate-900 mt-0.5 md:mt-1 tracking-tight truncate">{value}</div>
                                    <div className={`text-[9px] md:text-[11px] font-semibold mt-1 inline-block px-1.5 py-0.5 rounded ${tint}`}>Kết toán xong</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter Controller Tabs Bar */}
                <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center shadow-sm overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-2">
                    <div className="flex gap-1.5 w-full">
                        {FILTER_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilterMethod(tab.key)}
                                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterMethod === tab.key
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                {tab.label}
                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${filterMethod === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ═════════════════════════════════════════════════════════════
                    2. LAYOUT DESKTOP VIEW - TABLE (md:block)
                ═════════════════════════════════════════════════════════════ */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-6">Khách hàng</th>
                                    <th className="py-3.5 px-6">Phòng máy</th>
                                    <th className="py-3.5 px-6">Thời gian sử dụng</th>
                                    <th className="py-3.5 px-6">Chi phí chi tiết (đ)</th>
                                    <th className="py-3.5 px-6">Giao dịch</th>
                                    <th className="py-3.5 px-6 text-right">Chức năng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                {filteredInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-slate-400 font-medium">Không tìm thấy dữ liệu hóa đơn phù hợp.</td>
                                    </tr>
                                ) : (
                                    filteredInvoices.map((inv) => {
                                        const method = PAYMENT_METHOD_MAP[inv.paymentMethod] || PAYMENT_METHOD_MAP.cash;
                                        return (
                                            <tr key={inv._id} className="hover:bg-slate-50/70 transition-colors group">
                                                <td className="py-4 px-6">
                                                    {/* <div className="text-[10px] text-indigo-600 font-mono font-bold">#{inv._id}</div> */}
                                                    <div className="font-bold text-slate-900 text-sm mt-0.5">{inv.bookingId?.customerName}</div>
                                                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{inv.bookingId?.customerPhone}</div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700 border border-slate-200 text-xs">
                                                        {inv.bookingId?.roomId?.roomNumber || "N/A"}
                                                    </span>
                                                    <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                                                        {inv.bookingId?.roomId?.type || "Standard"}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 space-y-1">
                                                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                                                        <Clock size={12} className="text-slate-400" />
                                                        {inv.actualHours} giờ chơi
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                                        <Calendar size={12} className="text-slate-300" />
                                                        {new Date(inv.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })} - {new Date(inv.createdAt).toLocaleDateString("vi-VN")}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 space-y-0.5 font-medium">
                                                    <div className="text-slate-500">Tiền phòng: <span className="text-slate-800 font-semibold">{inv.roomCharge.toLocaleString()}đ</span></div>
                                                    <div className="text-slate-500">Dịch vụ lẻ: <span className="text-slate-800 font-semibold">{inv.serviceCharge.toLocaleString()}đ</span></div>
                                                    {inv.discountAmount > 0 && (
                                                        <div className="text-rose-600">Mã giảm giá: <span>-{inv.discountAmount.toLocaleString()}đ</span></div>
                                                    )}
                                                    <div className="text-emerald-600 font-extrabold text-sm pt-0.5 border-t border-dashed border-slate-200 mt-1">
                                                        Tổng thu: {inv.totalAmount.toLocaleString()}đ
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${method.badge}`}>
                                                        {method.short}
                                                    </span>
                                                    <div className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-0.5">
                                                        ● Giao dịch thành công
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex gap-2 items-center justify-end">
                                                        <button onClick={() => setDetailInvoice(inv)} className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition shadow-xs" title="Xem chi tiết">
                                                            <Eye size={13} />
                                                        </button>
                                                        <button onClick={() => setDetailInvoice(inv)} className="p-1.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition shadow-xs" title="In hóa đơn">
                                                            <Printer size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── LAYOUT MOBILE VIEW - CARDS (md:hidden) ── */}
                <div className="md:hidden space-y-2.5">
                    {filteredInvoices.length === 0 ? (
                        <div className="bg-white border border-dashed border-slate-300 rounded-xl py-14 text-center">
                            <p className="text-slate-400 font-medium text-xs">Không tìm thấy dữ liệu hóa đơn phù hợp.</p>
                        </div>
                    ) : (
                        filteredInvoices.map((inv) => {
                            const method = PAYMENT_METHOD_MAP[inv.paymentMethod] || PAYMENT_METHOD_MAP.cash;
                            return (
                                <button
                                    key={inv._id}
                                    onClick={() => setDetailInvoice(inv)}
                                    className="w-full text-left bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden active:scale-[0.99] transition-transform"
                                >
                                    <div className="flex">
                                        <div className={`w-1 shrink-0 ${method.bar}`} />
                                        <div className="flex-1 p-3.5 space-y-3 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                                            {inv.bookingId?.roomId?.roomNumber || "N/A"}
                                                        </span>
                                                    </div>
                                                    <div className="font-bold text-slate-900 text-sm mt-1.5 truncate">{inv.bookingId?.customerName}</div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Tổng thu</div>
                                                    <div className="text-base font-extrabold text-emerald-600 tabular-nums">{formatCurrency(inv.totalAmount)}</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                        <Clock size={9} /> Thời gian
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-900 mt-0.5">{inv.actualHours} giờ chơi</div>
                                                    <div className="text-[10px] text-slate-500 font-medium truncate">
                                                        {new Date(inv.createdAt).toLocaleDateString("vi-VN")} · {new Date(inv.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Giao dịch</div>
                                                    <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${method.badge}`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        {method.short}
                                                    </span>
                                                    {inv.discountAmount > 0 && (
                                                        <div className="text-[9px] text-rose-600 font-semibold mt-1 flex items-center gap-0.5">
                                                            <Tag size={9} /> -{formatCurrency(inv.discountAmount)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400 pt-0.5">
                                                <Eye size={12} /> Chạm để xem chi tiết & in hoá đơn
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </main>

            {/* ══════════════════════════════════════
                BOTTOM SHEET & DIALOG CHI TIẾT HOÁ ĐƠN 
            ══════════════════════════════════════ */}
            {detailInvoice && (() => {
                const inv = detailInvoice;
                const method = PAYMENT_METHOD_MAP[inv.paymentMethod] || PAYMENT_METHOD_MAP.cash;
                return (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center animate-in fade-in duration-200 p-0 md:p-4">
                        <div className="bg-white border-t md:border border-slate-200 rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-200">
                            <div className="md:hidden"><SheetHandle /></div>

                            {/* Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-indigo-50 to-white shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                                        <Receipt size={18} className="text-indigo-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-bold text-slate-900 truncate">Hoá đơn #{inv._id}</h3>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                                            {inv.bookingId?.customerName} · {inv.bookingId?.roomId?.roomNumber || "---"}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setDetailInvoice(null)} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 transition shrink-0">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Content Body */}
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                {/* Thông tin khách & thời gian */}
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 space-y-2">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Thông tin sử dụng</div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Khách hàng</span>
                                        <span className="font-semibold text-slate-800">{inv.bookingId?.customerName}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Số điện thoại</span>
                                        <span className="font-semibold text-slate-800 font-mono">{inv.bookingId?.customerPhone}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Phòng máy</span>
                                        <span className="font-semibold text-slate-800">{inv.bookingId?.roomId?.roomNumber} · {inv.bookingId?.roomId?.type}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2 mt-1">
                                        <span className="text-slate-500">Thời gian chơi thực tế</span>
                                        <span className="font-bold text-indigo-600">{inv.actualHours} giờ</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 flex items-center gap-1">Thời điểm tạo</span>
                                        <span className="font-semibold text-slate-800">
                                            {new Date(inv.createdAt).toLocaleDateString("vi-VN")} · {new Date(inv.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                {/* Dịch vụ đã dùng */}
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Dịch vụ đã gọi</div>
                                    {(!inv.orderedItems || inv.orderedItems.length === 0) ? (
                                        <p className="text-xs text-slate-400 italic text-center py-2">Không có dịch vụ nào kèm theo</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {inv.orderedItems.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                            {item.quantity}
                                                        </span>
                                                        <span className="text-slate-700 font-medium truncate">{item.name}</span>
                                                    </div>
                                                    <span className="font-semibold text-slate-800 shrink-0">{formatCurrency(item.quantity * item.priceAtOrder)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Phương thức thanh toán */}
                                <div className="space-y-2">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phương thức thanh toán</div>
                                    <div className={`flex items-center justify-between rounded-xl border p-3 ${method.badge}`}>
                                        <span className="text-xs font-bold">{method.label}</span>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Kết toán hoàn tất
                                        </span>
                                    </div>
                                </div>

                                {/* Tổng kết hoá đơn */}
                                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tổng kết</div>
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Tiền phòng</span>
                                        <span className="font-medium text-slate-700">{formatCurrency(inv.roomCharge)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Dịch vụ quầy</span>
                                        <span className="font-medium text-slate-700">{formatCurrency(inv.serviceCharge)}</span>
                                    </div>
                                    {inv.discountAmount > 0 && (
                                        <div className="flex justify-between text-xs text-rose-600">
                                            <span>Khấu trừ giảm giá</span>
                                            <span className="font-semibold">- {formatCurrency(inv.discountAmount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                        <span className="text-sm font-bold text-slate-900">Tổng thu thực tế</span>
                                        <span className="text-lg font-extrabold text-emerald-600">{formatCurrency(inv.totalAmount)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2.5 shrink-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
                                <button onClick={() => setDetailInvoice(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition">
                                    Đóng
                                </button>
                                <button onClick={() => window.print()} className="flex-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm">
                                    <Printer size={14} /> In hoá đơn
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}