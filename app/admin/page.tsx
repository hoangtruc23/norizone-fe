"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle, XCircle, LogIn, RefreshCw, Plus, X,
    Zap, Calendar, Clock, Phone, Timer,
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

// Lấy 1-2 ký tự đầu của tên khách để làm avatar chữ cái
const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1]?.[0]?.toUpperCase() || "?";
};

// Handle kéo trên cùng bottom sheet — tín hiệu thị giác chuyên nghiệp cho modal trượt lên
const SheetHandle = () => (
    <div className="flex justify-center pt-2.5 pb-1 shrink-0">
        <div className="w-9 h-1.5 rounded-full bg-slate-200" />
    </div>
);

export default function AdminDashboardMobile() {
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [rooms, setRooms] = useState<RoomOption[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});
    const [deleteConfirm, setDeleteConfirm] = useState<{ bookingId: string; itemId: string; itemName: string } | null>(null);
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

    const [statusFilter, setStatusFilter] = useState<"all" | Booking["status"]>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);

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

    const finalTotal = checkoutModal
        ? Math.max(0, checkoutModal.totalBeforeDiscount - discountAmount)
        : 0;

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
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-indigo-500/10 pb-28">

            {/* ── HEADER ── */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="px-4 h-14 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">Quản lý đặt phòng</h1>
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
                        <button
                            onClick={fetchBookings}
                            className="p-2.5 rounded-lg border border-slate-200 bg-white active:scale-95 transition-all shadow-sm"
                        >
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
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm theo tên hoặc số điện thoại..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* ── TOAST ── */}
            {toast && (
                <div className="fixed top-16 left-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-white border-emerald-200 text-emerald-800 animate-in fade-in slide-in-from-top-4 duration-200">
                    <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0"><Zap size={12} /></div>
                    <span className="text-xs font-semibold">{toast.text}</span>
                </div>
            )}

            {/* ── MAIN ── */}
            <main className="px-4 pt-4 space-y-4">

                {/* Stats — 3 ô compact trong 1 hàng, quét nhanh bằng mắt */}
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

                {/* Filter tabs — pill, cuộn ngang, có số lượng */}
                <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
                    {FILTER_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${statusFilter === tab.key
                                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200"
                                }`}
                        >
                            {tab.label}
                            <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Danh sách booking */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-0.5">
                        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {visibleBookings.length} kết quả
                        </h2>
                    </div>

                    {visibleBookings.length === 0 ? (
                        <div className="bg-white border border-dashed border-slate-300 rounded-xl py-14 text-center">
                            <p className="text-slate-400 font-medium text-xs">Không tìm thấy lịch đặt phù hợp.</p>
                        </div>
                    ) : (
                        visibleBookings.map((b) => {
                            const config = STATUS_MAP[b.status] ?? STATUS_MAP.cancelled;
                            return (
                                <div key={b._id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                    {/* Dải màu trạng thái bên trái — quét nhanh không cần đọc chữ */}
                                    <div className="flex">
                                        <div className={`w-1 shrink-0 ${config.solid}`} />
                                        <div className="flex-1 p-3.5 space-y-3 min-w-0">

                                            {/* Hàng trên: avatar + tên + trạng thái */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                        {getInitials(b.customerName)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-slate-900 text-sm truncate">{b.customerName}</div>
                                                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <Phone size={10} className="shrink-0" /> {b.customerPhone}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${config.badge}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                                                    {config.short}
                                                </span>
                                            </div>

                                            {/* Info grid: phòng + thời gian, luôn cùng bố cục để dễ so sánh giữa các thẻ */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Phòng</div>
                                                    <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">{b.roomId?.roomNumber || "Chưa xếp"}</div>
                                                    <div className="text-[10px] text-indigo-600 font-medium truncate">{b.roomId?.type || "Standard"}</div>
                                                </div>
                                                <div className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                        <Calendar size={9} /> Ngày
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">{b.bookingDate}</div>
                                                    <div className="text-[10px] text-slate-500 font-medium truncate">
                                                        {b.status === "checkin" ? (b.checkinTime || b.startTime)
                                                            : b.status === "completed" ? `${b.checkinTime}–${b.checkoutTime || "-"}`
                                                                : `${b.startTime}–${b.endTime || "-"}`}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Đồng hồ đếm giờ khi đang check-in */}
                                            {b.status === "checkin" && (
                                                <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-2">
                                                    <div className="flex items-center gap-1.5 text-purple-700">
                                                        <Timer size={13} />
                                                        <span className="text-[10px] font-semibold">Thời gian sử dụng</span>
                                                    </div>
                                                    <span className="font-mono font-bold text-purple-700 text-xs tabular-nums">{formatDuration(b)}</span>
                                                </div>
                                            )}

                                            {/* Dịch vụ */}
                                            {b.orderedItems && b.orderedItems.length > 0 && (
                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedServices(prev => ({ ...prev, [b._id]: !prev[b._id] }))}
                                                        className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-2 rounded-lg transition active:scale-[0.98]"
                                                    >
                                                        <span>Dịch vụ đã gọi ({b.orderedItems.length})</span>
                                                        <ChevronDown size={13} className={`transition-transform ${expandedServices[b._id] ? "rotate-180" : ""}`} />
                                                    </button>

                                                    {expandedServices[b._id] && (
                                                        <div className="flex flex-wrap gap-1.5 mt-2 animate-in fade-in duration-150">
                                                            {b.orderedItems.map((item) => {
                                                                const menuItem = getMenuItem(item.itemId);
                                                                const idStr = getItemIdStr(item.itemId);
                                                                return (
                                                                    <button
                                                                        key={`${b._id}-${idStr}`}
                                                                        type="button"
                                                                        onClick={() => setDeleteConfirm({
                                                                            bookingId: b._id,
                                                                            itemId: idStr,
                                                                            itemName: menuItem?.name || "Dịch vụ"
                                                                        })}
                                                                        className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 active:bg-rose-50 active:text-rose-700 active:border-rose-200 transition flex items-center gap-1"
                                                                    >
                                                                        {menuItem?.name || "Dịch vụ"} ×{item.quantity}
                                                                        <X size={10} className="opacity-50" />
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Thao tác */}
                                            <div className="flex gap-2 pt-1">
                                                {b.status === "pending" && (
                                                    <button onClick={() => handleUpdateStatus(b._id, "confirmed")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-blue-600 active:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm">
                                                        <CheckCircle size={14} /> Xác nhận
                                                    </button>
                                                )}
                                                {b.status === "confirmed" && (
                                                    <button onClick={() => handleUpdateStatus(b._id, "checkin")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-purple-600 active:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm">
                                                        <LogIn size={13} /> Nhận phòng
                                                    </button>
                                                )}
                                                {b.status === "checkin" && (
                                                    <>
                                                        <button
                                                            onClick={() => openCheckoutModal(b)}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 active:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                                                        >
                                                            <Receipt size={13} /> Tính tiền
                                                        </button>
                                                        <button
                                                            onClick={() => { setServiceQuantities({}); setServiceModal({ bookingId: b._id }); }}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-slate-200 bg-white active:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
                                                        >
                                                            <Plus size={13} /> Dịch vụ
                                                        </button>
                                                    </>
                                                )}
                                                {b.status !== "completed" && b.status !== "cancelled" && (
                                                    <button onClick={() => handleUpdateStatus(b._id, "cancelled")} className="py-2.5 px-3.5 rounded-lg border border-rose-200 bg-white active:bg-rose-50 text-rose-600 transition-all" title="Huỷ lịch">
                                                        <XCircle size={14} />
                                                    </button>
                                                )}
                                                {(b.status === "completed" || b.status === "cancelled") && (
                                                    <div className="flex-1 text-center text-[11px] text-slate-400 font-medium py-2">
                                                        {b.status === "completed" ? "Đã thanh toán đầy đủ" : "Lịch đặt đã huỷ"}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* Nút thêm lịch đặt — nổi cố định, safe-area aware */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed right-4 z-30 flex items-center gap-1.5 px-5 py-3.5 rounded-full bg-indigo-600 active:bg-indigo-700 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
                style={{ bottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))" }}
            >
                <Plus size={16} /> Thêm lịch
            </button>

            {/* ══════════════════════════════════════
                MODAL TẠO BOOKING — bottom sheet
            ══════════════════════════════════════ */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end justify-center animate-in fade-in duration-200">
                    <div className="bg-white border-t border-slate-200 rounded-t-2xl shadow-xl w-full max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200">
                        <SheetHandle />
                        <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Thêm lịch đặt phòng mới</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Tạo đơn đặt máy/phòng cho khách hàng</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 transition">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateBooking} className="p-4 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-1 gap-3.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tên khách hàng</label>
                                    <input type="text" required placeholder="Ví dụ: Nguyễn Văn A" value={newBooking.customerName}
                                        onChange={(e) => setNewBooking(prev => ({ ...prev, customerName: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Số điện thoại</label>
                                    <input type="tel" required placeholder="Ví dụ: 0901234567" value={newBooking.customerPhone}
                                        onChange={(e) => setNewBooking(prev => ({ ...prev, customerPhone: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chỉ định phòng máy</label>
                                    <select required value={newBooking.roomId} onChange={(e) => setNewBooking(prev => ({ ...prev, roomId: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition">
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
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Giờ vào dự kiến</label>
                                        <input type="time" required value={newBooking.startTime}
                                            onChange={(e) => setNewBooking(prev => ({ ...prev, startTime: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Giờ ra dự kiến</label>
                                        <input type="time" value={newBooking.endTime}
                                            onChange={(e) => setNewBooking(prev => ({ ...prev, endTime: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2.5 items-center pt-3 border-t border-slate-100 pb-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition">Hủy bỏ</button>
                                <button type="submit" disabled={submitLoading} className="flex-1 py-3 rounded-xl bg-indigo-600 active:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm">
                                    {submitLoading ? "Đang xử lý..." : "Lưu lịch đặt"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════
                MODAL THÊM DỊCH VỤ — bottom sheet
            ══════════════════════════════════════ */}
            {serviceModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end justify-center animate-in fade-in duration-200">
                    <div className="bg-white border-t border-slate-200 rounded-t-2xl shadow-xl w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
                        <SheetHandle />
                        <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Thêm dịch vụ</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Chọn đồ ăn / thức uống cho khách</p>
                            </div>
                            <button onClick={() => { setServiceModal(null); setServiceQuantities({}); }} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 transition">
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
                                    <div key={item._id} className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl border border-slate-100 bg-slate-50 transition">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-slate-800 truncate">{item.name}</div>
                                            <div className="text-[11px] text-indigo-600 font-medium mt-0.5">{formatCurrency(item.price)}</div>
                                            {item.category && <div className="text-[10px] text-slate-400 mt-0.5">{item.category}</div>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => setServiceQuantities(prev => ({ ...prev, [item._id]: Math.max(0, (prev[item._id] || 0) - 1) }))}
                                                className="w-8 h-8 rounded-md border border-slate-200 bg-white text-slate-500 active:bg-rose-50 active:text-rose-600 active:border-rose-200 text-base font-bold flex items-center justify-center transition">−</button>
                                            <span className="w-6 text-center text-xs font-bold text-slate-700 tabular-nums">{serviceQuantities[item._id] || 0}</span>
                                            <button onClick={() => setServiceQuantities(prev => ({ ...prev, [item._id]: (prev[item._id] || 0) + 1 }))}
                                                className="w-8 h-8 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-600 active:bg-indigo-600 active:text-white text-base font-bold flex items-center justify-center transition">+</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs text-slate-500 font-medium">Tổng cộng:</span>
                                <span className="text-sm font-bold text-indigo-700">{formatCurrency(serviceModalTotal)}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setServiceModal(null); setServiceQuantities({}); }} className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition">Hủy</button>
                                <button onClick={() => handleAddFromServiceModal(serviceModal.bookingId)} disabled={serviceModalTotal === 0}
                                    className="flex-1 py-3 rounded-xl bg-indigo-600 active:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold transition">
                                    Xác nhận thêm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════
                DIALOG XÁC NHẬN XÓA DỊCH VỤ
            ══════════════════════════════════════ */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-sm w-full p-5 animate-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                <XCircle size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Xác nhận hủy dịch vụ</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Bạn có chắc chắn muốn xóa dịch vụ <span className="font-bold text-slate-800">{deleteConfirm.itemName}</span> ra khỏi phòng này không?
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    await handleRemoveOrderItem(deleteConfirm.bookingId, deleteConfirm.itemId);
                                    setDeleteConfirm(null);
                                }}
                                className="px-3.5 py-2 rounded-lg bg-rose-600 active:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
                            >
                                Đồng ý xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════
                MODAL TÍNH TIỀN (CHECKOUT) — bottom sheet
            ══════════════════════════════════════ */}
            {checkoutModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end justify-center animate-in fade-in duration-200">
                    <div className="bg-white border-t border-slate-200 rounded-t-2xl shadow-2xl w-full max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200">
                        <SheetHandle />

                        {/* Header */}
                        <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-emerald-50 to-white shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                                    <Receipt size={18} className="text-emerald-600" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-900">Hoá đơn thanh toán</h3>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                                        {checkoutModal.booking.customerName} · {checkoutModal.booking.roomId?.roomNumber || "---"}
                                    </p>
                                </div>
                            </div>
                            <button onClick={closeCheckoutModal} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 transition shrink-0">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4 overflow-y-auto flex-1">

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
                                    <span className="text-slate-500">
                                        Tiền phòng ({formatRoomRateLabel(checkoutModal.booking.roomId?.pricePerHour, now.getHours() * 60 + now.getMinutes())})
                                    </span>
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
                                        {checkoutModal.booking.orderedItems.map((item, idx) => {
                                            const menuItem = getMenuItem(item.itemId);
                                            return (
                                                <div key={idx} className="flex justify-between items-center text-xs">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                            {item.quantity}
                                                        </span>
                                                        <span className="text-slate-700 font-medium truncate">{menuItem?.name || "Dịch vụ"}</span>
                                                    </div>
                                                    <span className="font-semibold text-slate-800 shrink-0">{formatCurrency(item.quantity * (menuItem?.price || 0))}</span>
                                                </div>
                                            );
                                        })}
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
                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Nhập số tiền giảm (VD: 50000)"
                                        value={discountInput}
                                        onChange={(e) => handleDiscountInput(e.target.value)}
                                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition pr-8"
                                    />
                                    {discountAmount > 0 && (
                                        <button
                                            onClick={() => { setDiscountAmount(0); setDiscountInput(""); }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-1.5 flex-wrap">
                                    {[10000, 20000, 50000, 100000].map(preset => (
                                        <button
                                            key={preset}
                                            onClick={() => { setDiscountInput(String(preset)); handleDiscountInput(String(preset)); }}
                                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition ${discountAmount === preset
                                                ? "bg-amber-500 text-white border-amber-500"
                                                : "bg-white text-amber-700 border-amber-200"
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
                                                : "bg-white text-slate-600 border-slate-200"
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
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2.5 shrink-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
                            <button
                                onClick={closeCheckoutModal}
                                className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirmCheckout}
                                disabled={checkoutLoading}
                                className="flex-2 py-3 rounded-xl bg-emerald-600 active:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                            >
                                {checkoutLoading ? (
                                    <><RefreshCw size={13} className="animate-spin" /> Đang xử lý...</>
                                ) : (
                                    <><CheckCircle size={13} /> Xác nhận {formatCurrency(finalTotal)}</>
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}