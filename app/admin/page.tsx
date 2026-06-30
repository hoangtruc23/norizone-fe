"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle, XCircle, LogIn, RefreshCw, Plus, X,
    ChevronRight, Zap, Calendar, Clock, Phone, AlertCircle, Timer,
    Receipt, CreditCard, Banknote, Wallet
} from "lucide-react";
import { bookingService } from "@/app/services/bookingService";
import { authService } from "@/app/services/authService";
import { roomService } from "@/app/services/roomService";
import { menuService } from "@/app/services/menuService";
import { invoiceService } from "@/app/services/invoiceService"; // Thêm invoiceService

// interface BookingItem {
//     name: string;
//     quantity: number;
//     priceAtOrder: number;
// }

interface Booking {
    _id: string;
    customerName: string;
    customerPhone: string;
    bookingDate: string;
    startTime: string;
    endTime?: string;
    checkinTime: string;
    checkoutTime: string;
    status: "pending" | "confirmed" | "checkin" | "completed" | "cancelled";
    orderedItems?: [];
    amount?: number;
    roomId?: { _id: string; roomNumber: string; type: string; pricePerHour?: number };
}

interface RoomOption {
    _id: string;
    roomNumber: string;
    type: string;
}

interface MenuItem {
    _id: string;
    name: string;
    price: number;
    category?: string;
}

// State cho modal tính tiền
interface CheckoutModal {
    booking: Booking;
    actualHours: number;
    roomCharge: number;
    serviceCharge: number;
    totalBeforeDiscount: number;
}

const STATUS_MAP: Record<string, { label: string; badge: string; dot: string }> = {
    pending: { label: "Chờ xác nhận", badge: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
    confirmed: { label: "Đã xác nhận", badge: "bg-blue-50 text-blue-700 border border-blue-200", dot: "bg-blue-500" },
    checkin: { label: "Đang dùng phòng", badge: "bg-purple-50 text-purple-700 border border-purple-200", dot: "bg-purple-500" },
    completed: { label: "Đã hoàn thành", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
    cancelled: { label: "Đã huỷ lịch", badge: "bg-rose-50 text-rose-700 border border-rose-200", dot: "bg-rose-500" },
};

const PAYMENT_METHODS = [
    { value: "cash", label: "Tiền mặt", icon: Banknote },
    { value: "banking", label: "Chuyển khoản", icon: CreditCard },
    { value: "momo", label: "MoMo", icon: Wallet },
];

const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

const parseTimeToMinutes = (value: string) => {
    if (!value) return 0;
    const [hour, minute] = value.split(":").map(Number);
    return (hour || 0) * 60 + (minute || 0);
};

export default function AdminDashboard() {
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [rooms, setRooms] = useState<RoomOption[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

    // Modal tạo booking
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [newBooking, setNewBooking] = useState({
        customerName: "",
        customerPhone: "",
        bookingDate: new Date().toLocaleDateString('sv-SE'),
        startTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        endTime: "",
        roomId: "",
    });

    // Modal dịch vụ
    const [serviceModal, setServiceModal] = useState<{ bookingId: string } | null>(null);
    const [serviceQuantities, setServiceQuantities] = useState<Record<string, number>>({});

    // Modal tính tiền (checkout)
    const [checkoutModal, setCheckoutModal] = useState<CheckoutModal | null>(null);
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [discountInput, setDiscountInput] = useState<string>("");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "banking" | "momo">("cash");
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const [now, setNow] = useState(new Date());

    const showToast = (type: "ok" | "err", text: string) => {
        setToast({ type, text });
        setTimeout(() => setToast(null), 3500);
    };

    const formatDuration = (booking: Booking) => {
        const startMinutes = parseTimeToMinutes(booking.checkinTime || booking.startTime);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        let diffMinutes = currentMinutes - startMinutes;
        if (diffMinutes < 0) diffMinutes += 24 * 60;
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
    };

    const calculateBookingTotals = (booking: Booking) => {
        const startMinutes = parseTimeToMinutes(booking.checkinTime || booking.startTime);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        let diffMinutes = currentMinutes - startMinutes;
        if (diffMinutes < 0) diffMinutes += 24 * 60;

        const actualHours = Number((diffMinutes / 60).toFixed(2));
        const roomRate = booking.roomId?.pricePerHour || 0;
        const roomCharge = Math.round(actualHours * roomRate);
        const serviceCharge = (booking.orderedItems || []).reduce(
            (total, item) => total + item.quantity * item.priceAtOrder, 0
        );
        const totalAmount = roomCharge + serviceCharge;
        return { actualHours, roomCharge, serviceCharge, totalAmount };
    };

    // Mở modal tính tiền — snapshot số liệu tại thời điểm bấm
    const openCheckoutModal = (booking: Booking) => {
        const { actualHours, roomCharge, serviceCharge, totalAmount } = calculateBookingTotals(booking);
        setCheckoutModal({
            booking,
            actualHours,
            roomCharge,
            serviceCharge,
            totalBeforeDiscount: totalAmount,
        });
        setDiscountAmount(0);
        setDiscountInput("");
        setPaymentMethod("cash");
    };

    const closeCheckoutModal = () => {
        setCheckoutModal(null);
        setDiscountAmount(0);
        setDiscountInput("");
    };

    // Xử lý nhập discount — hỗ trợ nhập số tiền trực tiếp (VND)
    const handleDiscountInput = (val: string) => {
        setDiscountInput(val);
        const parsed = parseInt(val.replace(/\D/g, ""), 10);
        if (!isNaN(parsed) && checkoutModal) {
            // Giới hạn discount không vượt quá tổng tiền
            setDiscountAmount(Math.min(parsed, checkoutModal.totalBeforeDiscount));
        } else {
            setDiscountAmount(0);
        }
    };

    // Xác nhận tính tiền → tạo invoice + cập nhật booking status = completed
    const handleConfirmCheckout = async () => {
        if (!checkoutModal) return;
        setCheckoutLoading(true);

        const { booking, actualHours, roomCharge, serviceCharge, totalBeforeDiscount } = checkoutModal;
        const finalTotal = Math.max(0, totalBeforeDiscount - discountAmount);

        const now_ = new Date();
        const checkoutTime = `${String(now_.getHours()).padStart(2, "0")}:${String(now_.getMinutes()).padStart(2, "0")}`;

        try {
            // 1. Tạo invoice
            const invoicePayload = {
                bookingId: booking._id,
                actualHours,
                roomCharge,
                orderedItems: booking.orderedItems || [],
                serviceCharge,
                discountAmount,
                totalAmount: finalTotal,
                paymentMethod,
                isPaid: true,
            };
            await invoiceService.create(invoicePayload);

            // 2. Cập nhật booking → completed + checkoutTime
            await bookingService.update(booking._id, {
                status: "completed",
                checkoutTime,
            });

            setBookings(prev =>
                prev.map(b =>
                    b._id === booking._id
                        ? { ...b, status: "completed", checkoutTime }
                        : b
                )
            );

            showToast("ok", `Đã thanh toán ${formatCurrency(finalTotal)} — ${PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label}`);
            closeCheckoutModal();
        } catch (err: any) {
            showToast("err", err?.message || "Lỗi khi tạo hoá đơn!");
        } finally {
            setCheckoutLoading(false);
        }
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const res = await bookingService.getAll();
            if (res) setBookings(res);
        } catch {
            showToast("err", "Không thể lấy danh sách đặt phòng");
        } finally { setLoading(false); }
    };

    const fetchRooms = async () => {
        try {
            const res = await roomService.getAll({ status: 'available' });
            setRooms(res);
        } catch { }
    };

    const fetchMenu = async () => {
        try {
            const res = await menuService.getAll();
            setMenuItems(Array.isArray(res) ? res : res.data || []);
        } catch {
            showToast("err", "Không thể tải menu dịch vụ");
        }
    };

    useEffect(() => {
        window.setTimeout(() => {
            void fetchBookings();
            void fetchRooms();
            void fetchMenu();
        }, 0);
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleCreateBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBooking.roomId) { showToast("err", "Vui lòng chọn chỉ định phòng máy!"); return; }
        setSubmitLoading(true);
        try {
            await bookingService.create({
                customerName: newBooking.customerName,
                customerPhone: newBooking.customerPhone,
                roomId: newBooking.roomId,
                bookingDate: newBooking.bookingDate,
                startTime: newBooking.startTime,
                endTime: newBooking.endTime,
                status: "pending"
            });
            showToast("ok", "Đã thêm lịch đặt mới thành công!");
            setIsModalOpen(false);
            setNewBooking({
                customerName: "", customerPhone: "",
                bookingDate: new Date().toLocaleDateString('sv-SE'),
                startTime: "12:00", endTime: "14:00", roomId: "",
            });
            fetchBookings();
        } catch (err: any) {
            showToast("err", err?.message || "Lỗi khi lưu lịch đặt phòng!");
        } finally { setSubmitLoading(false); }
    };

    const handleAddFromServiceModal = async (bookingId: string) => {
        const currentBooking = bookings.find(b => b._id === bookingId);
        if (!currentBooking) return;
        const existingItems = currentBooking.orderedItems || [];
        let updatedItems = [...existingItems];
        for (const menuItem of menuItems) {
            const qty = serviceQuantities[menuItem._id] || 0;
            if (qty <= 0) continue;
            const existingIndex = updatedItems.findIndex(i => i.name === menuItem.name);
            if (existingIndex >= 0) {
                updatedItems[existingIndex] = { ...updatedItems[existingIndex], quantity: updatedItems[existingIndex].quantity + qty };
            } else {
                updatedItems.push({ name: menuItem.name, quantity: qty, priceAtOrder: menuItem.price });
            }
        }
        setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, orderedItems: updatedItems } : b));
        try {
            await bookingService.update(bookingId, { orderedItems: updatedItems });
            showToast("ok", "Đã thêm dịch vụ vào đơn!");
        } catch { showToast("ok", "Đã lưu dịch vụ cục bộ!"); }
        setServiceQuantities({});
        setServiceModal(null);
    };

    const handleRemoveOrderItem = async (id: string, itemName: string) => {
        const currentBooking = bookings.find(b => b._id === id);
        if (!currentBooking) return;
        const updatedItems = (currentBooking.orderedItems || []).filter(item => item.name !== itemName);
        setBookings(prev => prev.map(b => b._id === id ? { ...b, orderedItems: updatedItems } : b));
        try {
            await bookingService.update(id, { orderedItems: updatedItems });
            showToast("ok", `Đã xóa ${itemName}`);
        } catch { showToast("ok", `Đã xóa ${itemName} cục bộ`); }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        const updatedStatus = newStatus as Booking["status"];
        let additionalData: Record<string, string> = {};
        if (newStatus === "checkin") {
            const h = String(now.getHours()).padStart(2, "0");
            const m = String(now.getMinutes()).padStart(2, "0");
            const y = now.getFullYear();
            const mo = String(now.getMonth() + 1).padStart(2, "0");
            const d = String(now.getDate()).padStart(2, "0");
            additionalData = { checkinTime: `${h}:${m}`, bookingDate: `${y}-${mo}-${d}` };
        }
        try {
            await bookingService.update(id, { status: newStatus, ...additionalData });
        } catch { }
        setBookings(prev => prev.map(b => b._id === id ? { ...b, status: updatedStatus, ...additionalData } : b));
        showToast("ok", `Cập nhật thành công → ${STATUS_MAP[newStatus]?.label}`);
    };

    const pendingCount = bookings.filter(b => b.status === "pending").length;
    const checkinCount = bookings.filter(b => b.status === "checkin").length;
    const completedCount = bookings.filter(b => b.status === "completed").length;

    const serviceModalTotal = menuItems.reduce(
        (sum, item) => sum + (serviceQuantities[item._id] || 0) * item.price, 0
    );

    // Tổng cuối sau khi trừ discount
    const finalTotal = checkoutModal
        ? Math.max(0, checkoutModal.totalBeforeDiscount - discountAmount)
        : 0;

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-indigo-500/10">
            <div className="flex-1 flex flex-col min-w-0">

                {/* ── HEADER ── */}
                <header className="bg-white border-b border-slate-200 px-8 h-16 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">NORI Workspace</span>
                        <ChevronRight size={14} className="text-slate-300" />
                        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 font-medium">Quản lý đặt phòng</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={fetchBookings} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all active:scale-95 shadow-sm">
                            <RefreshCw size={14} className={`text-slate-500 ${loading ? "animate-spin text-indigo-600" : ""}`} />
                            Đồng bộ dữ liệu
                        </button>
                        <button
                            onClick={() => { authService.logout(); router.replace("/admin/login"); }}
                            className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-all"
                        >
                            Đăng xuất
                        </button>
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-4 ring-indigo-50">A</div>
                    </div>
                </header>

                {/* ── TOAST ── */}
                {toast && (
                    <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-white border-emerald-200 text-emerald-800 animate-in fade-in slide-in-from-top-4 duration-200">
                        <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-600"><Zap size={12} /></div>
                        <span className="text-xs font-semibold">{toast.text}</span>
                    </div>
                )}

                {/* ── MAIN ── */}
                <main className="flex-1 p-8 max-w-400 w-full mx-auto space-y-6">

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[
                            { label: "Đơn chờ duyệt", value: pendingCount, desc: "Cần xử lý gấp", border: "border-slate-200", bgIcon: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
                            { label: "Khách đang dùng", value: checkinCount, desc: "Phòng đang hoạt động", border: "border-slate-200", bgIcon: "bg-purple-50 text-purple-600", dot: "bg-purple-500" },
                            { label: "Đã thanh toán", value: completedCount, desc: "Hoàn thành hôm nay", border: "border-slate-200", bgIcon: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
                        ].map(({ label, value, desc, border, bgIcon, dot }) => (
                            <div key={label} className={`bg-white border rounded-xl p-5 flex items-center justify-between shadow-sm ${border}`}>
                                <div className="space-y-1">
                                    <div className="text-xs text-slate-500 font-medium tracking-wide">{label}</div>
                                    <div className="text-2xl font-bold tracking-tight text-slate-900">{value}</div>
                                    <div className="text-[11px] text-slate-400 font-normal flex items-center gap-1.5 pt-0.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span> {desc}
                                    </div>
                                </div>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${bgIcon}`}>
                                    <AlertCircle size={18} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">Danh sách điều phối phòng</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Tổng cộng {bookings.length} lượt đặt chỗ được ghi nhận</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                            >
                                <Plus size={15} /> Thêm lịch đặt
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-3 px-6">Khách hàng</th>
                                        <th className="py-3 px-6">Phòng chỉ định</th>
                                        <th className="py-3 px-6">Khung thời gian</th>
                                        <th className="py-3 px-6">Trạng thái</th>
                                        <th className="py-3 px-6 text-right">Thao tác nhanh</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                    {bookings.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400 font-medium text-xs">Hệ thống trống.</td>
                                        </tr>
                                    ) : (
                                        bookings.map((b) => {
                                            const config = STATUS_MAP[b.status] ?? STATUS_MAP.cancelled;
                                            return (
                                                <tr key={b._id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                                                    <td className="py-4 px-6">
                                                        <div className="font-semibold text-slate-900">{b.customerName}</div>
                                                        <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                            <Phone size={11} className="text-slate-300" /> {b.customerPhone}
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-6">
                                                        <p className="text-[10px] text-indigo-600 font-semibold tracking-wider uppercase mt-0.5">
                                                            {b.roomId?.type || "Standard"} - {b.roomId?.roomNumber || "Chưa xếp"}
                                                        </p>
                                                    </td>

                                                    <td className="py-4 px-6">
                                                        {b.status === "checkin" ? (
                                                            <div className="flex flex-col gap-1.5">
                                                                <div className="font-bold text-indigo-600 text-sm flex items-center gap-1.5 bg-indigo-50/70 px-2 py-1 rounded-md border border-indigo-100 w-fit animate-pulse">
                                                                    <Timer size={14} className="text-indigo-500 shrink-0" />
                                                                    <span className="font-mono tracking-wider">{formatDuration(b)}</span>
                                                                </div>
                                                                <div className="text-[11px] text-slate-400 pl-1">Vào lúc: {b.checkinTime || b.startTime}</div>
                                                                {b.orderedItems && b.orderedItems.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                        {b.orderedItems.map((item) => (
                                                                            <button
                                                                                key={`${b._id}-${item.name}`}
                                                                                type="button"
                                                                                onClick={() => handleRemoveOrderItem(b._id, item.name)}
                                                                                className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition"
                                                                                title="Bấm để xoá"
                                                                            >
                                                                                {item.name} x{item.quantity} ×
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : b.status === "completed" ? (
                                                            <>
                                                                <div className="font-medium text-slate-800 flex items-center gap-1.5">
                                                                    <Clock size={13} className="text-slate-400" />
                                                                    {b.checkinTime} – {b.checkoutTime || "-"}
                                                                </div>
                                                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                                    <Calendar size={13} className="text-slate-300" /> {b.bookingDate}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="font-medium text-slate-800 flex items-center gap-1.5">
                                                                    <Clock size={13} className="text-slate-400" />
                                                                    {b.startTime} – {b.endTime || "-"}
                                                                </div>
                                                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                                    <Calendar size={13} className="text-slate-300" /> {b.bookingDate}
                                                                </div>
                                                            </>
                                                        )}
                                                    </td>

                                                    <td className="py-4 px-6">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.badge}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                                                            {config.label}
                                                        </span>
                                                    </td>

                                                    <td className="py-4 px-6 text-right">
                                                        <div className="flex gap-2 items-center justify-end">
                                                            {b.status === "pending" && (
                                                                <button onClick={() => handleUpdateStatus(b._id, "confirmed")} className="flex items-center gap-1 p-1.5 px-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 text-xs font-bold transition-all shadow-sm" title="Duyệt đặt phòng">
                                                                    <CheckCircle size={14} /> Xác nhận
                                                                </button>
                                                            )}
                                                            {b.status === "confirmed" && (
                                                                <button onClick={() => handleUpdateStatus(b._id, "checkin")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-600 text-xs font-bold transition-all shadow-sm">
                                                                    <LogIn size={13} /> Nhận phòng
                                                                </button>
                                                            )}
                                                            {b.status === "checkin" && (
                                                                <>
                                                                    {/* Mở modal tính tiền */}
                                                                    <button
                                                                        onClick={() => openCheckoutModal(b)}
                                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 text-xs font-bold transition-all shadow-sm"
                                                                    >
                                                                        <Receipt size={13} /> Tính tiền
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setServiceQuantities({}); setServiceModal({ bookingId: b._id }); }}
                                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 text-xs font-bold transition-all shadow-sm"
                                                                    >
                                                                        <Plus size={13} /> Dịch vụ
                                                                    </button>
                                                                </>
                                                            )}
                                                            {b.status !== "completed" && b.status !== "cancelled" && (
                                                                <button onClick={() => handleUpdateStatus(b._id, "cancelled")} className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 transition-all shadow-sm" title="Huỷ lịch">
                                                                    <XCircle size={14} />
                                                                </button>
                                                            )}
                                                            {(b.status === "completed" || b.status === "cancelled") && (
                                                                <span className="text-xs text-slate-400 font-medium select-none pr-2">---</span>
                                                            )}
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
            </div>

            {/* ══════════════════════════════════════
                MODAL TẠO BOOKING
            ══════════════════════════════════════ */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Thêm lịch đặt phòng mới</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Tạo đơn đặt máy/phòng cho khách hàng</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition">
                                <X size={15} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateBooking} className="p-5 space-y-4">
                            <div className="grid grid-cols-1 gap-3.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tên khách hàng</label>
                                    <input type="text" required placeholder="Ví dụ: Nguyễn Văn A" value={newBooking.customerName}
                                        onChange={(e) => setNewBooking(prev => ({ ...prev, customerName: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Số điện thoại</label>
                                    <input type="tel" required placeholder="Ví dụ: 0901234567" value={newBooking.customerPhone}
                                        onChange={(e) => setNewBooking(prev => ({ ...prev, customerPhone: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chỉ định phòng máy</label>
                                    <select required value={newBooking.roomId} onChange={(e) => setNewBooking(prev => ({ ...prev, roomId: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition cursor-pointer">
                                        <option value="" disabled>-- Chọn phòng trống --</option>
                                        {rooms.map((room) => (
                                            <option key={room._id} value={room._id}>{room.roomNumber} ({room.type})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ngày đặt phòng</label>
                                    <input type="date" required value={newBooking.bookingDate}
                                        onChange={(e) => setNewBooking(prev => ({ ...prev, bookingDate: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Giờ vào dự kiến</label>
                                        <input type="time" required value={newBooking.startTime}
                                            onChange={(e) => setNewBooking(prev => ({ ...prev, startTime: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Giờ ra dự kiến</label>
                                        <input type="time" value={newBooking.endTime}
                                            onChange={(e) => setNewBooking(prev => ({ ...prev, endTime: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2.5 items-center justify-end pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition">Hủy bỏ</button>
                                <button type="submit" disabled={submitLoading} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                                    {submitLoading ? "Đang xử lý..." : "Lưu lịch đặt"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════
                MODAL THÊM DỊCH VỤ
            ══════════════════════════════════════ */}
            {serviceModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Thêm dịch vụ</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Chọn đồ ăn / thức uống cho khách</p>
                            </div>
                            <button onClick={() => { setServiceModal(null); setServiceQuantities({}); }} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
                            {menuItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
                                    <RefreshCw size={20} className="animate-spin" />
                                    <p className="text-xs font-medium">Đang tải menu...</p>
                                </div>
                            ) : (
                                menuItems.map((item) => (
                                    <div key={item._id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-100 hover:shadow-sm transition">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-slate-800 truncate">{item.name}</div>
                                            <div className="text-[11px] text-indigo-600 font-medium mt-0.5">{formatCurrency(item.price)}</div>
                                            {item.category && <div className="text-[10px] text-slate-400 mt-0.5">{item.category}</div>}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button onClick={() => setServiceQuantities(prev => ({ ...prev, [item._id]: Math.max(0, (prev[item._id] || 0) - 1) }))}
                                                className="w-6 h-6 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-sm font-bold flex items-center justify-center transition">−</button>
                                            <span className="w-6 text-center text-xs font-bold text-slate-700 tabular-nums">{serviceQuantities[item._id] || 0}</span>
                                            <button onClick={() => setServiceQuantities(prev => ({ ...prev, [item._id]: (prev[item._id] || 0) + 1 }))}
                                                className="w-6 h-6 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white text-sm font-bold flex items-center justify-center transition">+</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs text-slate-500 font-medium">Tổng cộng:</span>
                                <span className="text-sm font-bold text-indigo-700">{formatCurrency(serviceModalTotal)}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setServiceModal(null); setServiceQuantities({}); }} className="flex-1 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">Hủy</button>
                                <button onClick={() => handleAddFromServiceModal(serviceModal.bookingId)} disabled={serviceModalTotal === 0}
                                    className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold transition">
                                    Xác nhận thêm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════
                MODAL TÍNH TIỀN (CHECKOUT)
            ══════════════════════════════════════ */}
            {checkoutModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <Receipt size={18} className="text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Hoá đơn thanh toán</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {checkoutModal.booking.customerName} · {checkoutModal.booking.roomId?.roomNumber || "---"}
                                    </p>
                                </div>
                            </div>
                            <button onClick={closeCheckoutModal} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition">
                                <X size={15} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

                            {/* ── Thông tin thời gian ── */}
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 space-y-2">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Thời gian sử dụng</div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Giờ vào</span>
                                    <span className="font-semibold text-slate-800">{checkoutModal.booking.checkinTime || checkoutModal.booking.startTime}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Giờ ra (hiện tại)</span>
                                    <span className="font-semibold text-slate-800">
                                        {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2 mt-1">
                                    <span className="text-slate-500">Số giờ thực tế</span>
                                    <span className="font-bold text-indigo-600">{checkoutModal.actualHours.toFixed(2)} giờ</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Tiền phòng ({formatCurrency(checkoutModal.booking.roomId?.pricePerHour || 0)}/h)</span>
                                    <span className="font-semibold text-slate-800">{formatCurrency(checkoutModal.roomCharge)}</span>
                                </div>
                            </div>

                            {/* ── Dịch vụ đã dùng ── */}
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Dịch vụ đã gọi</div>
                                {(!checkoutModal.booking.orderedItems || checkoutModal.booking.orderedItems.length === 0) ? (
                                    <p className="text-xs text-slate-400 italic text-center py-2">Không có dịch vụ nào</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {checkoutModal.booking.orderedItems.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                        {item.quantity}
                                                    </span>
                                                    <span className="text-slate-700 font-medium">{item.name}</span>
                                                </div>
                                                <span className="font-semibold text-slate-800">{formatCurrency(item.quantity * item.priceAtOrder)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2 mt-1">
                                            <span className="text-slate-500">Tổng dịch vụ</span>
                                            <span className="font-semibold text-slate-800">{formatCurrency(checkoutModal.serviceCharge)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Ô nhập Discount ── */}
                            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5 space-y-2.5">
                                <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Mã giảm giá / Ưu đãi</div>
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            placeholder="Nhập số tiền giảm (VD: 50000)"
                                            value={discountInput}
                                            onChange={(e) => handleDiscountInput(e.target.value)}
                                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition pr-8"
                                        />
                                        {discountAmount > 0 && (
                                            <button
                                                onClick={() => { setDiscountAmount(0); setDiscountInput(""); }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {/* Nút gợi ý nhanh */}
                                <div className="flex gap-1.5 flex-wrap">
                                    {[10000, 20000, 50000, 100000].map(preset => (
                                        <button
                                            key={preset}
                                            onClick={() => { setDiscountInput(String(preset)); handleDiscountInput(String(preset)); }}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${discountAmount === preset
                                                ? "bg-amber-500 text-white border-amber-500"
                                                : "bg-white text-amber-700 border-amber-200 hover:bg-amber-100"
                                                }`}
                                        >
                                            -{formatCurrency(preset)}
                                        </button>
                                    ))}
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                                        <CheckCircle size={12} /> Đang giảm {formatCurrency(discountAmount)}
                                    </div>
                                )}
                            </div>

                            {/* ── Phương thức thanh toán ── */}
                            <div className="space-y-2">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phương thức thanh toán</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                                        <button
                                            key={value}
                                            onClick={() => setPaymentMethod(value as typeof paymentMethod)}
                                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition ${paymentMethod === value
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                                                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50"
                                                }`}
                                        >
                                            <Icon size={16} />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── Tổng kết hoá đơn ── */}
                            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tổng kết</div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Tiền phòng</span>
                                    <span className="font-medium text-slate-700">{formatCurrency(checkoutModal.roomCharge)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Dịch vụ</span>
                                    <span className="font-medium text-slate-700">{formatCurrency(checkoutModal.serviceCharge)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-xs text-emerald-600">
                                        <span>Giảm giá</span>
                                        <span className="font-semibold">- {formatCurrency(discountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                    <span className="text-sm font-bold text-slate-900">Tổng thanh toán</span>
                                    <span className="text-lg font-extrabold text-emerald-600">{formatCurrency(finalTotal)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer actions */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2.5">
                            <button
                                onClick={closeCheckoutModal}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirmCheckout}
                                disabled={checkoutLoading}
                                className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                            >
                                {checkoutLoading ? (
                                    <><RefreshCw size={13} className="animate-spin" /> Đang xử lý...</>
                                ) : (
                                    <><CheckCircle size={13} /> Xác nhận thanh toán {formatCurrency(finalTotal)}</>
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}