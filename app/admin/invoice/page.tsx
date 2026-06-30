"use client";
import React, { useState, useEffect } from "react";
import {
    Search, Receipt, Calendar, Clock, DollarSign,
    CreditCard, Eye, Printer, Filter, RefreshCw, ChevronRight,
    Utensils, Sparkles
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

const PAYMENT_METHOD_MAP: Record<string, { label: string; badge: string }> = {
    cash: { label: "Tiền mặt", badge: "bg-slate-100 text-slate-700 border border-slate-200" },
    banking: { label: "Chuyển khoản", badge: "bg-blue-50 text-blue-700 border border-blue-200" },
    momo: { label: "Ví MoMo", badge: "bg-pink-50 text-pink-700 border border-pink-200" },
};

export default function InvoiceManagement() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterMethod, setFilterMethod] = useState("all");

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await invoiceService.getAll()
            // Tạm thời dùng mock data chuẩn cấu trúc MongoDB của bạn để hiển thị UI
            setInvoices(res);
            setLoading(false);
        } catch (error) {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchInvoices();
    }, []);

    // Bộ lọc dữ liệu theo ô tìm kiếm và hình thức thanh toán
    const filteredInvoices = invoices.filter(inv => {
        const matchSearch =
            inv.bookingId?.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.bookingId?.customerPhone.includes(searchTerm) ||
            inv._id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchMethod = filterMethod === "all" || inv.paymentMethod === filterMethod;

        return matchSearch && matchMethod;
    });

    // Tính tổng doanh thu hiển thị trên các thẻ thống kê nhanh
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalService = filteredInvoices.reduce((sum, inv) => sum + inv.serviceCharge, 0);

    return (
        <>
            {/* Header đồng bộ với hệ thống */}
            <header className="bg-white border-b border-slate-200 px-8 h-16 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-600">NORI Workspace</span>
                    <ChevronRight size={14} className="text-slate-300" />
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 font-medium">
                        Quản lý hóa đơn
                    </span>
                </div>

                <button
                    onClick={fetchInvoices}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all active:scale-95 shadow-sm"
                >
                    <RefreshCw size={14} className={`text-slate-500 ${loading ? "animate-spin text-indigo-600" : ""}`} />
                    Làm mới dữ liệu
                </button>
            </header>

            {/* Khung nội dung chính */}
            <main className="flex-1 p-8 max-w-400 w-full mx-auto space-y-6">
                {/* Hàng thẻ thống kê nhanh (Mini Stats) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
                        <div className="space-y-1">
                            <div className="text-xs text-slate-500 font-medium tracking-wide">Tổng doanh thu bộ lọc</div>
                            <div className="text-2xl font-bold tracking-tight text-slate-900">{totalRevenue.toLocaleString()}đ</div>
                            <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                                <Sparkles size={12} /> Đã thanh toán 100%
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-indigo-50 text-indigo-600">
                            <DollarSign size={18} />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
                        <div className="space-y-1">
                            <div className="text-xs text-slate-500 font-medium tracking-wide">Tiền dịch vụ đồ ăn</div>
                            <div className="text-2xl font-bold tracking-tight text-slate-900">{totalService.toLocaleString()}đ</div>
                            <div className="text-[11px] text-slate-400 font-normal">Doanh thu từ quầy Bar/Kitchen</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-amber-50 text-amber-600">
                            <Utensils size={18} />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
                        <div className="space-y-1">
                            <div className="text-xs text-slate-500 font-medium tracking-wide">Số lượng hóa đơn</div>
                            <div className="text-2xl font-bold tracking-tight text-slate-900">{filteredInvoices.length} đơn</div>
                            <div className="text-[11px] text-slate-400 font-normal">Lượt kết toán thành công</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-purple-50 text-purple-600">
                            <Receipt size={18} />
                        </div>
                    </div>
                </div>

                {/* Thanh điều hướng tìm kiếm và lọc dữ liệu nâng cao */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
                    <div className="relative w-full sm:w-80">
                        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm tên khách, số điện thoại, mã đơn..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
                            <Filter size={13} className="text-slate-400" />
                            <select
                                value={filterMethod}
                                onChange={(e) => setFilterMethod(e.target.value)}
                                className="bg-transparent font-medium focus:outline-none cursor-pointer"
                            >
                                <option value="all">Tất cả phương thức</option>
                                <option value="cash">Tiền mặt</option>
                                <option value="banking">Chuyển khoản</option>
                                <option value="momo">Ví MoMo</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Bảng dữ liệu hóa đơn chính */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    {/* <th className="py-3 px-6">Mã HD</th> */}
                                    <th className="py-3 px-6">Khách hàng</th>
                                    <th className="py-3 px-6">Phòng</th>
                                    <th className="py-3 px-6">Thời gian sử dụng</th>
                                    <th className="py-3 px-6">Chi tiết tiền (đ)</th>
                                    <th className="py-3 px-6">Thanh toán</th>
                                    <th className="py-3 px-6 text-right">Tác vụ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                {filteredInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                                            Không tìm thấy dữ liệu hóa đơn phù hợp.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInvoices.map((inv) => {
                                        const method = PAYMENT_METHOD_MAP[inv.paymentMethod] || PAYMENT_METHOD_MAP.cash;
                                        return (
                                            <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors duration-150">
                                                {/* Mã Hóa Đơn */}
                                                {/* <td className="py-4 px-6 font-mono font-bold text-slate-900">
                                                    #{inv._id}
                                                </td> */}

                                                {/* Khách hàng */}
                                                <td className="py-4 px-6">
                                                    <div className="font-semibold text-slate-900">{inv.bookingId?.customerName}</div>
                                                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{inv.bookingId?.customerPhone}</div>
                                                </td>

                                                {/* Phòng */}
                                                <td className="py-4 px-6">
                                                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700 border border-slate-200">
                                                        {inv.bookingId?.roomId.roomNumber}
                                                    </span>
                                                    <div className="text-[10px] text-indigo-600 font-semibold tracking-wider uppercase mt-0.5">
                                                        {inv.bookingId?.roomId.type}
                                                    </div>
                                                </td>

                                                {/* Thời gian thực tế */}
                                                <td className="py-4 px-6 space-y-1">
                                                    <div className="font-medium text-slate-800 flex items-center gap-1">
                                                        <Clock size={12} className="text-slate-400" />
                                                        {inv.actualHours} giờ chơi
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                                        <Calendar size={12} className="text-slate-300" />
                                                        {new Date(inv.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })} - {new Date(inv.createdAt).toLocaleDateString("vi-VN")}
                                                    </div>
                                                </td>

                                                {/* Khối bóc tách chi phí cụ thể */}
                                                <td className="py-4 px-6 space-y-0.5 font-medium">
                                                    <div className="text-slate-500">Phòng: <span className="text-slate-800 font-semibold">{inv.roomCharge.toLocaleString()}</span></div>
                                                    <div className="text-slate-500">Dịch vụ: <span className="text-slate-800 font-semibold">{inv.serviceCharge.toLocaleString()}</span></div>
                                                    {inv.discountAmount > 0 && (
                                                        <div className="text-rose-600">Giảm giá: <span>-{inv.discountAmount.toLocaleString()}</span></div>
                                                    )}
                                                    <div className="text-indigo-600 font-bold text-sm pt-0.5 border-t border-dashed border-slate-200">
                                                        Tổng: {inv.totalAmount.toLocaleString()}
                                                    </div>
                                                </td>

                                                {/* Trạng thái / Phương thức */}
                                                <td className="py-4 px-6">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${method.badge}`}>
                                                        {method.label}
                                                    </span>
                                                    <div className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-0.5">
                                                        ● Đã thu tiền
                                                    </div>
                                                </td>

                                                {/* Thao tác In / Xem nhanh */}
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex gap-2.5 items-center justify-end">
                                                        <button
                                                            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                                            title="Xem chi tiết hóa đơn"
                                                        >
                                                            <Eye size={13} />
                                                        </button>
                                                        <button
                                                            className="p-1.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                            title="In hóa đơn (Bill)"
                                                        >
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
            </main>
        </>
    );
}