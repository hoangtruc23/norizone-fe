"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle, XCircle, LogIn, RefreshCw, Plus, X,
    Zap, Calendar, Clock, Phone, Timer, ChevronRight,
    Receipt, CreditCard, Banknote, Wallet, ChevronDown, Search
} from "lucide-react";
import { bookingService } from "@/app/services/bookingService";
import { authService } from "@/app/services/authService";
import { roomService } from "@/app/services/roomService";
import { menuService } from "@/app/services/menuService";
import { invoiceService } from "@/app/services/invoiceService";

type PopulatedMenuRef = { _id: string; name: string; price: number; category?: string };

interface ServiceItem {
    itemId: string | PopulatedMenuRef;
    quantity: number;
}

type ShiftRates = { morning: number; afternoon: number; evening: number };
type RoomRate = number | ShiftRates;

const isShiftRates = (rate: RoomRate | undefined): rate is ShiftRates =>
    typeof rate === "object" && rate !== null;

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
    orderedItems?: ServiceItem[];
    amount?: number;
    roomId?: { _id: string; roomNumber: string; type: string; pricePerHour?: RoomRate };
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

interface CheckoutModal {
    booking: Booking;
    actualHours: number;
    roomCharge: number;
    serviceCharge: number;
    totalBeforeDiscount: number;
}

const STATUS_MAP: Record<string, { label: string; short: string; badge: string; dot: string; solid: string }> = {
    pending: { label: "Chờ xác nhận", short: "Chờ duyệt", badge: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500", solid: "bg-amber-500" },
    confirmed: { label: "Đã xác nhận", short: "Xác nhận", badge: "bg-blue-50 text-blue-700 border border-blue-200", dot: "bg-blue-500", solid: "bg-blue-500" },
    checkin: { label: "Đang dùng phòng", short: "Đang dùng", badge: "bg-purple-50 text-purple-700 border border-purple-200", dot: "bg-purple-500", solid: "bg-purple-500" },
    completed: { label: "Đã hoàn thành", short: "Hoàn thành", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500", solid: "bg-emerald-500" },
    cancelled: { label: "Đã huỷ lịch", short: "Đã huỷ", badge: "bg-rose-50 text-rose-700 border border-rose-200", dot: "bg-rose-500", solid: "bg-rose-500" },
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

const getItemIdStr = (itemId: string | PopulatedMenuRef): string =>
    typeof itemId === "string" ? itemId : itemId?._id;

const SHIFT_START = 8 * 60;
const SHIFT_BOUNDARIES = [8 * 60, 13 * 60, 18 * 60, 23 * 60];

const getRateAtMinute = (absoluteMinute: number, rates: ShiftRates): number => {
    const m = ((absoluteMinute % 1440) + 1440) % 1440;
    if (m >= 8 * 60 && m < 13 * 60) return rates.morning;
    if (m >= 13 * 60 && m < 18 * 60) return rates.afternoon;
    return rates.evening;
};

const calculateRoomCharge = (startMinutes: number, durationMinutes: number, rate: RoomRate | undefined): number => {
    if (durationMinutes <= 0 || rate === undefined) return 0;
    if (!isShiftRates(rate)) {
        return Math.round((durationMinutes / 60) * rate);
    }
    let charge = 0;
    let cursor = startMinutes;
    const end = startMinutes + durationMinutes;
    while (cursor < end) {
        const dayOffset = Math.floor(cursor / 1440) * 1440;
        const minuteOfDay = cursor - dayOffset;
        const nextBoundary = SHIFT_BOUNDARIES.find(b => b > minuteOfDay);
        const nextAbsolute = nextBoundary !== undefined ? dayOffset + nextBoundary : dayOffset + 1440 + SHIFT_START;
        const segmentEnd = Math.min(end, nextAbsolute);
        const segmentMinutes = segmentEnd - cursor;
        const segRate = getRateAtMinute(cursor, rate);
        charge += (segmentMinutes / 60) * segRate;
        cursor = segmentEnd;
    }
    return Math.round(charge);
};

const formatRoomRateLabel = (rate: RoomRate | undefined, atMinute: number): string => {
    if (rate === undefined) return formatCurrency(0) + "/h";
    if (!isShiftRates(rate)) return `${formatCurrency(rate)}/h`;
    const current = getRateAtMinute(atMinute, rate);
    return `${formatCurrency(current)}/h`;
};

const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1]?.[0]?.toUpperCase() || "?";
};

const SheetHandle = () => (
    <div className="flex justify-center pt-2.5 pb-1 shrink-0">
        <div className="w-9 h-1.5 rounded-full bg-slate-200" />
    </div>
);

export default function AdminDashboard() {
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [rooms, setRooms] = useState<RoomOption[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});
    const [deleteConfirm, setDeleteConfirm] = useState<{ bookingId: string; itemId: string; itemName: string } | null>(null);

    // Modals & Sheets
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

    const [serviceModal, setServiceModal] = useState<{ bookingId: string } | null>(null);
    const [serviceQuantities, setServiceQuantities] = useState<Record<string, number>>({});

    const [checkoutModal, setCheckoutModal] = useState<CheckoutModal | null>(null);
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [discountInput, setDiscountInput] = useState<string>("");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "banking" | "momo">("cash");
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    // Filters & Search
    const [statusFilter, setStatusFilter] = useState<"all" | Booking["status"]>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false); // Dành riêng cho Mobile toggle

    const [now, setNow] = useState(new Date());

    const showToast = (type: "ok" | "err", text: string) => {
        setToast({ type, text });
        setTimeout(() => setToast(null), 3500);
    };

    const getMenuItem = (itemId: string | PopulatedMenuRef): MenuItem | undefined => {
        if (itemId && typeof itemId === "object") {
            return { _id: itemId._id, name: itemId.name, price: itemId.price, category: itemId.category };
        }
        return menuItems.find(m => m._id === itemId);
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

        const actualHours = Math.floor((diffMinutes / 60) * 100) / 100;
        const roomCharge = calculateRoomCharge(startMinutes, diffMinutes, booking.roomId?.pricePerHour);

        const serviceCharge = (booking.orderedItems || []).reduce((total, item) => {
            const menuItem = getMenuItem(item.itemId);
            return total + (item.quantity || 0) * (menuItem?.price || 0);
        }, 0);

        const totalAmount = roomCharge + serviceCharge;
        return { actualHours, roomCharge, serviceCharge, totalAmount };
    };

    const openCheckoutModal = (booking: Booking) => {
        const { actualHours, roomCharge, serviceCharge, totalAmount } = calculateBookingTotals(booking);
        setCheckoutModal({ booking, actualHours, roomCharge, serviceCharge, totalBeforeDiscount: totalAmount });
        setDiscountAmount(0);
        setDiscountInput("");
        setPaymentMethod("cash");
    };

    const closeCheckoutModal = () => {
        setCheckoutModal(null);
        setDiscountAmount(0);
        setDiscountInput("");
    };

    const handleDiscountInput = (val: string) => {
        setDiscountInput(val);
        const parsed = parseInt(val.replace(/\D/g, ""), 10);
        if (!isNaN(parsed) && checkoutModal) {
            setDiscountAmount(Math.min(parsed, checkoutModal.totalBeforeDiscount));
        } else {
            setDiscountAmount(0);
        }
    };

    const handleConfirmCheckout = async () => {
        if (!checkoutModal) return;
        setCheckoutLoading(true);

        const { booking, actualHours, roomCharge, serviceCharge, totalBeforeDiscount } = checkoutModal;
        const finalTotal = Math.max(0, totalBeforeDiscount - discountAmount);

        const now_ = new Date();
        const checkoutTime = `${String(now_.getHours()).padStart(2, "0")}:${String(now_.getMinutes()).padStart(2, "0")}`;

        try {
            const normalizedItems = (booking.orderedItems || []).map(item => {
                const menuItem = getMenuItem(item.itemId);
                return {
                    itemId: getItemIdStr(item.itemId),
                    quantity: item.quantity,
                    name: menuItem?.name,
                    priceAtOrder: menuItem?.price || 0,
                };
            });

            const invoicePayload = {
                bookingId: booking._id,
                actualHours,
                roomCharge,
                orderedItems: normalizedItems,
                serviceCharge,
                discountAmount,
                totalAmount: finalTotal,
                paymentMethod,
                isPaid: true,
            };
            await invoiceService.create(invoicePayload);
            await bookingService.update(booking._id, { status: "completed", checkoutTime });

            setBookings(prev =>
                prev.map(b => b._id === booking._id ? { ...b, status: "completed", checkoutTime } : b)
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
        const existingItems = [...(currentBooking.orderedItems || [])];

        for (const menuItem of menuItems) {
            const qty = serviceQuantities[menuItem._id] || 0;
            if (qty <= 0) continue;
            const existingIndex = existingItems.findIndex(i => getItemIdStr(i.itemId) === menuItem._id);
            if (existingIndex >= 0) {
                existingItems[existingIndex] = {
                    ...existingItems[existingIndex],
                    quantity: existingItems[existingIndex].quantity + qty,
                };
            } else {
                existingItems.push({ itemId: menuItem._id, quantity: qty });
            }
        }

        setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, orderedItems: existingItems } : b));
        try {
            await bookingService.update(bookingId, { orderedItems: existingItems });
            showToast("ok", "Đã thêm dịch vụ vào đơn!");
        } catch {
            showToast("ok", "Đã lưu dịch vụ cục bộ!");
        }
        setServiceQuantities({});
        setServiceModal(null);
    };

    const handleRemoveOrderItem = async (bookingId: string, itemId: string) => {
        const currentBooking = bookings.find(b => b._id === bookingId);
        if (!currentBooking) return;
        const updatedItems = (currentBooking.orderedItems || []).filter(item => getItemIdStr(item.itemId) !== itemId);
        setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, orderedItems: updatedItems } : b));
        try {
            await bookingService.update(bookingId, { orderedItems: updatedItems });
            showToast("ok", "Đã xóa dịch vụ");
        } catch {
            showToast("ok", "Đã xóa dịch vụ cục bộ");
        }
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

    const visibleBookings = bookings
        .filter(b => statusFilter === "all" || b.status === statusFilter)
        .filter(b => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.trim().toLowerCase();
            return b.customerName.toLowerCase().includes(q) || b.customerPhone.includes(q);
        });

    const FILTER_TABS: { key: "all" | Booking["status"]; label: string; count: number }[] = [
        { key: "all", label: "Tất cả", count: bookings.length },
        { key: "pending", label: "Chờ duyệt", count: pendingCount },
        { key: "confirmed", label: "Xác nhận", count: bookings.filter(b => b.status === "confirmed").length },
        { key: "checkin", label: "Đang dùng", count: checkinCount },
        { key: "completed", label: "Hoàn thành", count: completedCount },
        { key: "cancelled", label: "Đã huỷ", count: bookings.filter(b => b.status === "cancelled").length },
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-indigo-500/10">

            {/* TOAST NOTIFICATION */}
            {toast && (
                <div className="fixed top-16 md:top-6 right-4 left-4 md:left-auto md:right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-white border-emerald-200 text-emerald-800 animate-in fade-in slide-in-from-top-4 duration-200">
                    <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0"><Zap size={12} /></div>
                    <span className="text-xs font-semibold">{toast.text}</span>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════
                1. INTERFACE CHO DESKTOP (md:flex / md:block)
            ═════════════════════════════════════════════════════════════ */}
            <div className="hidden md:flex flex-col min-w-0 w-full">
                {/* Desktop Header */}
                <header className="bg-white border-b border-slate-200 px-8 h-16 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">NORI Workspace</span>
                        <ChevronRight size={14} className="text-slate-300" />
                        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 font-medium">
                            Điều phối phòng máy
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative w-64">
                            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm tên khách, số điện thoại..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                            />
                        </div>
                        <button onClick={fetchBookings} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-sm active:scale-95">
                            <RefreshCw size={14} className={`text-slate-500 ${loading ? "animate-spin text-indigo-600" : ""}`} />
                            Đồng bộ
                        </button>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm active:scale-95">
                            <Plus size={14} /> Thêm lịch đặt
                        </button>
                    </div>
                </header>

                {/* Desktop Main Content */}
                <main className="p-8 max-w-full w-full mx-auto space-y-6">
                    {/* Desktop Counter Stats Grid */}
                    <div className="grid grid-cols-3 gap-5">
                        {[
                            { label: "Đơn chờ duyệt", value: pendingCount, desc: "Cần xử lý phê duyệt", bar: "bg-amber-500" },
                            { label: "Khách đang dùng", value: checkinCount, desc: "Phòng đang hoạt động", bar: "bg-purple-500" },
                            { label: "Đã xong hôm nay", value: completedCount, desc: "Kết toán thành công", bar: "bg-emerald-500" },
                        ].map(({ label, value, desc, bar }) => (
                            <div key={label} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
                                <div className={`h-1.5 ${bar}`} />
                                <div className="p-5 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-medium text-slate-400 tracking-wider uppercase">{label}</div>
                                        <div className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">{value}</div>
                                        <div className="text-xs text-slate-400 mt-1 font-normal">{desc}</div>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-400">#</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Controller Filter Bar */}
                    <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-1">
                            {FILTER_TABS.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setStatusFilter(tab.key)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition ${statusFilter === tab.key ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
                                >
                                    {tab.label}
                                    <span className={`ml-1.5 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md ${statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Desktop Main Table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-3.5 px-6">Khách hàng</th>
                                        <th className="py-3.5 px-6">Phòng máy</th>
                                        <th className="py-3.5 px-6">Khung thời gian</th>
                                        <th className="py-3.5 px-6">Trạng thái</th>
                                        <th className="py-3.5 px-6 text-right">Chức năng</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                    {visibleBookings.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-16 text-center text-slate-400 font-medium">Hệ thống trống. Không tìm thấy lịch đặt nào phù hợp.</td>
                                        </tr>
                                    ) : (
                                        visibleBookings.map((b) => {
                                            const config = STATUS_MAP[b.status] ?? STATUS_MAP.cancelled;
                                            return (
                                                <tr key={b._id} className="hover:bg-slate-50/70 transition-colors group">
                                                    <td className="py-4 px-6">
                                                        <div className="font-bold text-slate-900 text-sm">{b.customerName}</div>
                                                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                            <Phone size={11} className="text-slate-300" /> {b.customerPhone}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700 border border-slate-200 text-xs">
                                                            {b.roomId?.roomNumber || "Chưa xếp"}
                                                        </span>
                                                        <div className="text-[10px] text-indigo-600 font-semibold tracking-wider uppercase mt-0.5">
                                                            {b.roomId?.type || "Standard"}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        {b.status === "checkin" ? (
                                                            <div className="space-y-1">
                                                                <div className="font-bold text-purple-700 font-mono flex items-center gap-1.5 bg-purple-50 px-2 py-1 rounded-md border border-purple-100 w-fit animate-pulse">
                                                                    <Timer size={13} /> {formatDuration(b)}
                                                                </div>
                                                                <div className="text-[11px] text-slate-400 pl-0.5">Vào lúc: {b.checkinTime || b.startTime} · {b.bookingDate}</div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-0.5 font-medium">
                                                                <div className="text-slate-800 text-xs font-bold flex items-center gap-1">
                                                                    <Clock size={12} className="text-slate-400" />
                                                                    {b.status === "completed" ? `${b.checkinTime} – ${b.checkoutTime || "-"}` : `${b.startTime} – ${b.endTime || "-"}`}
                                                                </div>
                                                                <div className="text-[11px] text-slate-400">{b.bookingDate}</div>
                                                            </div>
                                                        )}

                                                        {/* Hiển thị dịch vụ kèm theo trực tiếp trên Table hàng */}
                                                        {b.status === "checkin" && b.orderedItems && b.orderedItems.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {b.orderedItems.map((item) => {
                                                                    const menuItem = getMenuItem(item.itemId);
                                                                    const idStr = getItemIdStr(item.itemId);
                                                                    return (
                                                                        <button
                                                                            key={idStr}
                                                                            onClick={() => setDeleteConfirm({ bookingId: b._id, itemId: idStr, itemName: menuItem?.name || "Dịch vụ" })}
                                                                            className="inline-flex items-center gap-1 rounded bg-slate-50 border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition"
                                                                            title="Nhấn để xoá mặt hàng"
                                                                        >
                                                                            {menuItem?.name} x{item.quantity}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.badge}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                                                            {config.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <div className="flex gap-2 items-center justify-end">
                                                            {b.status === "pending" && (
                                                                <button onClick={() => handleUpdateStatus(b._id, "confirmed")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 font-bold transition shadow-xs">
                                                                    <CheckCircle size={13} /> Duyệt đơn
                                                                </button>
                                                            )}
                                                            {b.status === "confirmed" && (
                                                                <button onClick={() => handleUpdateStatus(b._id, "checkin")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-600 font-bold transition shadow-xs">
                                                                    <LogIn size={13} /> Nhận phòng
                                                                </button>
                                                            )}
                                                            {b.status === "checkin" && (
                                                                <>
                                                                    <button onClick={() => openCheckoutModal(b)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 font-bold transition shadow-xs">
                                                                        <Receipt size={13} /> Tính tiền
                                                                    </button>
                                                                    <button onClick={() => { setServiceQuantities({}); setServiceModal({ bookingId: b._id }); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition shadow-xs">
                                                                        <Plus size={13} /> Thêm đồ
                                                                    </button>
                                                                </>
                                                            )}
                                                            {b.status !== "completed" && b.status !== "cancelled" && (
                                                                <button onClick={() => handleUpdateStatus(b._id, "cancelled")} className="p-1.5 rounded-lg border border-rose-100 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 transition-all" title="Huỷ lịch">
                                                                    <XCircle size={14} />
                                                                </button>
                                                            )}
                                                            {(b.status === "completed" || b.status === "cancelled") && (
                                                                <span className="text-slate-400 font-medium italic pr-2 select-none">---</span>
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

            {/* ═════════════════════════════════════════════════════════════
                2. INTERFACE CHO MOBILE - GIỮ NGUYÊN BẢN CŨ CỦA BẠN (md:hidden)
            ═════════════════════════════════════════════════════════════ */}
            <div className="md:hidden">
                {/* Header Mobile */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                    <div className="px-4 h-14 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">Quản lý đặt phòng</h1>
                            <p className="text-[10px] text-slate-400 leading-tight">Cập nhật lúc {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => setSearchOpen(v => !v)} className={`p-2.5 rounded-lg border transition-all active:scale-95 shadow-sm ${searchOpen ? "border-indigo-300 bg-indigo-50 text-indigo-600" : "border-slate-200 bg-white text-slate-500"}`}><Search size={15} /></button>
                            <button onClick={fetchBookings} className="p-2.5 rounded-lg border border-slate-200 bg-white active:scale-95 transition-all shadow-sm"><RefreshCw size={15} className={`text-slate-500 ${loading ? "animate-spin text-indigo-600" : ""}`} /></button>
                        </div>
                    </div>
                    {searchOpen && (
                        <div className="px-4 pb-3 animate-in slide-in-from-top-2 fade-in duration-150">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm theo tên hoặc số điện thoại..." className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition" />
                                {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X size={13} /></button>}
                            </div>
                        </div>
                    )}
                </header>

                {/* Mobile Main Content */}
                <main className="px-4 pt-4 space-y-4">
                    {/* Stats Mobile */}
                    <div className="grid grid-cols-3 gap-2.5">
                        {[
                            { label: "Chờ duyệt", value: pendingCount, bar: "bg-amber-500", tint: "bg-amber-50 text-amber-700" },
                            { label: "Đang dùng", value: checkinCount, bar: "bg-purple-500", tint: "bg-purple-50 text-purple-700" },
                            { label: "Đã xong", value: completedCount, bar: "bg-emerald-500", tint: "bg-emerald-50 text-emerald-700" },
                        ].map(({ label, value, bar, tint }) => (
                            <div key={label} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className={`h-1 ${bar}`} />
                                <div className="p-2.5">
                                    <div className="text-xl font-extrabold tracking-tight text-slate-900">{value}</div>
                                    <div className={`text-[10px] font-semibold mt-1 inline-block px-1.5 py-0.5 rounded ${tint}`}>{label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Filter tabs Mobile */}
                    <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
                        {FILTER_TABS.map(tab => (
                            <button key={tab.key} onClick={() => setStatusFilter(tab.key)} className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${statusFilter === tab.key ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-white text-slate-600 border-slate-200"}`}>
                                {tab.label} <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    {/* Mobile Booking List */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-0.5">
                            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{visibleBookings.length} kết quả</h2>
                        </div>
                        {visibleBookings.length === 0 ? (
                            <div className="bg-white border border-dashed border-slate-300 rounded-xl py-14 text-center">
                                <p className="text-slate-400 font-medium text-xs">Hệ thống trống. Không tìm thấy lịch đặt nào phù hợp.</p>
                            </div>
                        ) : (
                            visibleBookings.map((b) => {
                                const config = STATUS_MAP[b.status] ?? STATUS_MAP.cancelled;
                                return (
                                    <div key={b._id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                        <div className="flex">
                                            <div className={`w-1 shrink-0 ${config.solid}`} />
                                            <div className="flex-1 p-3.5 space-y-3 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">{getInitials(b.customerName)}</div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-900 text-sm truncate">{b.customerName}</div>
                                                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><Phone size={10} className="shrink-0" /> {b.customerPhone}</div>
                                                        </div>
                                                    </div>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${config.badge}`}><span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />{config.short}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Phòng</div>
                                                        <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">{b.roomId?.roomNumber || "Chưa xếp"}</div>
                                                        <div className="text-[10px] text-indigo-600 font-medium truncate">{b.roomId?.type || "Standard"}</div>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Calendar size={9} /> Ngày</div>
                                                        <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">{b.bookingDate}</div>
                                                        <div className="text-[10px] text-slate-500 font-medium truncate">{b.status === "checkin" ? (b.checkinTime || b.startTime) : b.status === "completed" ? `${b.checkinTime}–${b.checkoutTime || "-"}` : `${b.startTime}–${b.endTime || "-"}`}</div>
                                                    </div>
                                                </div>
                                                {b.status === "checkin" && (
                                                    <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-2">
                                                        <div className="flex items-center gap-1.5 text-purple-700"><Timer size={13} /><span className="text-[10px] font-semibold">Thời gian sử dụng</span></div>
                                                        <span className="font-mono font-bold text-purple-700 text-xs tabular-nums">{formatDuration(b)}</span>
                                                    </div>
                                                )}
                                                {b.orderedItems && b.orderedItems.length > 0 && (
                                                    <div>
                                                        <button type="button" onClick={() => setExpandedServices(prev => ({ ...prev, [b._id]: !prev[b._id] }))} className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-2 rounded-lg transition">
                                                            <span>Dịch vụ đã gọi ({b.orderedItems.length})</span>
                                                            <ChevronDown size={13} className={`transition-transform ${expandedServices[b._id] ? "rotate-180" : ""}`} />
                                                        </button>
                                                        {expandedServices[b._id] && (
                                                            <div className="flex flex-wrap gap-1.5 mt-2 animate-in fade-in duration-150">
                                                                {b.orderedItems.map((item) => {
                                                                    const menuItem = getMenuItem(item.itemId);
                                                                    const idStr = getItemIdStr(item.itemId);
                                                                    return (
                                                                        <button key={`${b._id}-${idStr}`} type="button" onClick={() => setDeleteConfirm({ bookingId: b._id, itemId: idStr, itemName: menuItem?.name || "Dịch vụ" })} className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 active:bg-rose-50 active:text-rose-700 active:border-rose-200 transition flex items-center gap-1">{menuItem?.name || "Dịch vụ"} ×{item.quantity}<X size={10} className="opacity-50" /></button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex gap-2 pt-1">
                                                    {b.status === "pending" && <button onClick={() => handleUpdateStatus(b._id, "confirmed")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-sm"><CheckCircle size={14} /> Xác nhận</button>}
                                                    {b.status === "confirmed" && <button onClick={() => handleUpdateStatus(b._id, "checkin")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-purple-600 text-white text-xs font-bold shadow-sm"><LogIn size={13} /> Nhận phòng</button>}
                                                    {b.status === "checkin" && (
                                                        <>
                                                            <button onClick={() => openCheckoutModal(b)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-sm"><Receipt size={13} /> Tính tiền</button>
                                                            <button onClick={() => { setServiceQuantities({}); setServiceModal({ bookingId: b._id }); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold"> <Plus size={13} /> Dịch vụ</button>
                                                        </>
                                                    )}
                                                    {b.status !== "completed" && b.status !== "cancelled" && <button onClick={() => handleUpdateStatus(b._id, "cancelled")} className="py-2.5 px-3.5 rounded-lg border border-rose-200 bg-white text-rose-600"><XCircle size={14} /></button>}
                                                    {(b.status === "completed" || b.status === "cancelled") && <div className="flex-1 text-center text-[11px] text-slate-400 font-medium py-2">{b.status === "completed" ? "Đã thanh toán đầy đủ" : "Lịch đặt đã huỷ"}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </main>

                {/* Nút thêm Mobile */}
                <button onClick={() => setIsModalOpen(true)} className="fixed right-4 z-30 flex items-center gap-1.5 px-5 py-3.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/30" style={{ bottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))" }}><Plus size={16} /> Thêm lịch</button>
            </div>

            {/* ═════════════════════════════════════════════════════════════
                3. POPUP MODALS / BOTTOM SHEETS THAM CHIẾU CHUNG
            ═════════════════════════════════════════════════════════════ */}
            {/* [MODAL 1]: TẠO BOOKING (Responsive Bottom-up ở Mobile / Center Card ở Desktop) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center animate-in fade-in duration-200 p-0 md:p-4">
                    <div className="bg-white border border-slate-200 rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] md:max-h-[95vh] flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-200">
                        <div className="md:hidden"><SheetHandle /></div>
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Thêm lịch đặt phòng mới</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Tạo đơn đặt máy/phòng cho khách hàng</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateBooking} className="p-6 space-y-4 overflow-y-auto">
                            <div className="space-y-3.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tên khách hàng</label>
                                    <input type="text" required placeholder="Ví dụ: Nguyễn Văn A" value={newBooking.customerName} onChange={(e) => setNewBooking(prev => ({ ...prev, customerName: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Số điện thoại</label>
                                    <input type="tel" required placeholder="Ví dụ: 0901234567" value={newBooking.customerPhone} onChange={(e) => setNewBooking(prev => ({ ...prev, customerPhone: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chỉ định phòng máy</label>
                                    <select required value={newBooking.roomId} onChange={(e) => setNewBooking(prev => ({ ...prev, roomId: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition cursor-pointer">
                                        <option value="" disabled>-- Chọn phòng trống --</option>
                                        {rooms.map((room) => <option key={room._id} value={room._id}>{room.roomNumber} ({room.type})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ngày đặt phòng</label>
                                    <input type="date" required value={newBooking.bookingDate} onChange={(e) => setNewBooking(prev => ({ ...prev, bookingDate: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Giờ vào dự kiến</label>
                                        <input type="time" required value={newBooking.startTime} onChange={(e) => setNewBooking(prev => ({ ...prev, startTime: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Giờ ra dự kiến</label>
                                        <input type="time" value={newBooking.endTime} onChange={(e) => setNewBooking(prev => ({ ...prev, endTime: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2.5 items-center pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition">Hủy bỏ</button>
                                <button type="submit" disabled={submitLoading} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm">
                                    {submitLoading ? "Đang xử lý..." : "Lưu lịch đặt"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* [MODAL 2]: THÊM DỊCH VỤ */}
            {serviceModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center animate-in fade-in duration-200 p-0 md:p-4">
                    <div className="bg-white border border-slate-200 rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-sm max-h-[85vh] md:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-200">
                        <div className="md:hidden"><SheetHandle /></div>
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Thêm dịch vụ</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Chọn thức uống / đồ ăn</p>
                            </div>
                            <button onClick={() => { setServiceModal(null); setServiceQuantities({}); }} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-4 space-y-2 overflow-y-auto flex-1">
                            {menuItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
                                    <RefreshCw size={20} className="animate-spin" />
                                    <p className="text-xs font-medium">Đang tải menu...</p>
                                </div>
                            ) : (
                                menuItems.map((item) => (
                                    <div key={item._id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-slate-800 truncate">{item.name}</div>
                                            <div className="text-[11px] text-indigo-600 font-medium mt-0.5">{formatCurrency(item.price)}</div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => setServiceQuantities(prev => ({ ...prev, [item._id]: Math.max(0, (prev[item._id] || 0) - 1) }))} className="w-7 h-8 rounded-md border border-slate-200 bg-white text-slate-500 text-sm font-bold flex items-center justify-center transition">−</button>
                                            <span className="w-5 text-center text-xs font-bold text-slate-700 tabular-nums">{serviceQuantities[item._id] || 0}</span>
                                            <button onClick={() => setServiceQuantities(prev => ({ ...prev, [item._id]: (prev[item._id] || 0) + 1 }))} className="w-7 h-8 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-600 text-sm font-bold flex items-center justify-center transition">+</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-5 border-t border-slate-100 bg-slate-50/50 shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs text-slate-500 font-medium">Tổng cộng:</span>
                                <span className="text-sm font-bold text-indigo-700">{formatCurrency(serviceModalTotal)}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setServiceModal(null); setServiceQuantities({}); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600">Hủy</button>
                                <button onClick={() => handleAddFromServiceModal(serviceModal.bookingId)} disabled={serviceModalTotal === 0} className="flex-1 py-2.5 rounded-xl bg-indigo-600 disabled:bg-slate-200 text-white text-xs font-bold shadow-sm">Xác nhận</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* [MODAL 3]: XÁC NHẬN XÓA DỊCH VỤ KÈM PHÒNG */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-sm w-full p-5 animate-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><XCircle size={18} /></div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Xác nhận hủy dịch vụ</h3>
                                <p className="text-xs text-slate-500 mt-1">Bạn muốn xóa mặt hàng <span className="font-bold text-slate-800">{deleteConfirm.itemName}</span> khỏi hóa đơn phòng chơi này?</p>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-slate-100">
                            <button type="button" onClick={() => setDeleteConfirm(null)} className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600">Hủy bỏ</button>
                            <button type="button" onClick={async () => { await handleRemoveOrderItem(deleteConfirm.bookingId, deleteConfirm.itemId); setDeleteConfirm(null); }} className="px-3.5 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold">Đồng ý xóa</button>
                        </div>
                    </div>
                </div>
            )}

            {/* [MODAL 4]: XÁC NHẬN TÍNH TIỀN (CHECKOUT) */}
            {checkoutModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center animate-in fade-in duration-200 p-0 md:p-4">
                    <div className="bg-white border border-slate-200 rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] md:max-h-[95vh] flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-200">
                        <div className="md:hidden"><SheetHandle /></div>
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-emerald-50 to-white shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0"><Receipt size={18} className="text-emerald-600" /></div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-900">Hoá đơn thanh toán</h3>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">{checkoutModal.booking.customerName} · {checkoutModal.booking.roomId?.roomNumber || "---"}</p>
                                </div>
                            </div>
                            <button onClick={closeCheckoutModal} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 shrink-0"><X size={16} /></button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 space-y-2">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Thời gian sử dụng</div>
                                <div className="flex justify-between items-center text-xs"><span className="text-slate-500">Giờ vào</span><span className="font-semibold text-slate-800">{checkoutModal.booking.checkinTime || checkoutModal.booking.startTime}</span></div>
                                <div className="flex justify-between items-center text-xs"><span className="text-slate-500">Giờ ra (hiện tại)</span><span className="font-semibold text-slate-800">{String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}</span></div>
                                <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2 mt-1"><span className="text-slate-500">Số giờ thực tế</span><span className="font-bold text-indigo-600">{checkoutModal.actualHours.toFixed(2)} giờ</span></div>
                                <div className="flex justify-between items-center text-xs"><span className="text-slate-500">Tiền phòng ({formatRoomRateLabel(checkoutModal.booking.roomId?.pricePerHour, now.getHours() * 60 + now.getMinutes())})</span><span className="font-semibold text-slate-800">{formatCurrency(checkoutModal.roomCharge)}</span></div>
                            </div>

                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Dịch vụ đã gọi</div>
                                {(!checkoutModal.booking.orderedItems || checkoutModal.booking.orderedItems.length === 0) ? (
                                    <p className="text-xs text-slate-400 italic text-center py-2">Không có dịch vụ nào</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {checkoutModal.booking.orderedItems.map((item, idx) => {
                                            const menuItem = getMenuItem(item.itemId);
                                            return (
                                                <div key={idx} className="flex justify-between items-center text-xs">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">{item.quantity}</span>
                                                        <span className="text-slate-700 font-medium truncate">{menuItem?.name || "Dịch vụ"}</span>
                                                    </div>
                                                    <span className="font-semibold text-slate-800 shrink-0">{formatCurrency(item.quantity * (menuItem?.price || 0))}</span>
                                                </div>
                                            );
                                        })}
                                        <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2 mt-1"><span className="text-slate-500">Tổng dịch vụ</span><span className="font-semibold text-slate-800">{formatCurrency(checkoutModal.serviceCharge)}</span></div>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5 space-y-2.5">
                                <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Mã giảm giá / Ưu đãi</div>
                                <div className="relative">
                                    <input type="text" inputMode="numeric" placeholder="Nhập số tiền giảm (VD: 50000)" value={discountInput} onChange={(e) => handleDiscountInput(e.target.value)} className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-amber-400 transition pr-8" />
                                    {discountAmount > 0 && <button onClick={() => { setDiscountAmount(0); setDiscountInput(""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X size={14} /></button>}
                                </div>
                                <div className="flex gap-1.5 flex-wrap">
                                    {[10000, 20000, 50000, 100000].map(preset => (
                                        <button key={preset} onClick={() => { setDiscountInput(String(preset)); handleDiscountInput(String(preset)); }} className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${discountAmount === preset ? "bg-amber-500 text-white border-amber-500 shadow-xs" : "bg-white text-amber-700 border-amber-200"}`}>-{formatCurrency(preset)}</button>
                                    ))}
                                </div>
                                {discountAmount > 0 && <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1"><CheckCircle size={12} /> Đang giảm {formatCurrency(discountAmount)}</div>}
                            </div>

                            <div className="space-y-2">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phương thức thanh toán</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                                        <button key={value} onClick={() => setPaymentMethod(value as typeof paymentMethod)} className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-bold transition ${paymentMethod === value ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200" : "bg-white text-slate-600 border-slate-200"}`}><Icon size={16} />{label}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng kết chi phí</div>
                                <div className="flex justify-between text-xs text-slate-500"><span>Tiền không gian</span><span className="font-medium text-slate-700">{formatCurrency(checkoutModal.roomCharge)}</span></div>
                                <div className="flex justify-between text-xs text-slate-500"><span>Tiền quầy dịch vụ</span><span className="font-medium text-slate-700">{formatCurrency(checkoutModal.serviceCharge)}</span></div>
                                {discountAmount > 0 && <div className="flex justify-between text-xs text-emerald-600"><span>Giảm trừ chiết khấu</span><span className="font-semibold">- {formatCurrency(discountAmount)}</span></div>}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-2"><span className="text-xs font-bold text-slate-900">Tổng thanh toán</span><span className="text-base font-extrabold text-emerald-600">{formatCurrency(finalTotal)}</span></div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2.5 shrink-0 sticky bottom-0">
                            <button onClick={closeCheckoutModal} className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600">Hủy bỏ</button>
                            <button onClick={handleConfirmCheckout} disabled={checkoutLoading} className="flex-2 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
                                {checkoutLoading ? <><RefreshCw size={13} className="animate-spin" /> Đang tạo hoá đơn...</> : <><CheckCircle size={13} /> Xác nhận {formatCurrency(finalTotal)}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}