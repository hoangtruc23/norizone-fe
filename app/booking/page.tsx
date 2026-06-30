"use client";
import React, { useState, useRef, useEffect } from "react";
import { Calendar, Clock, MapPin, Users, Ticket, HelpCircle, Mail, ChevronDown, Phone, ClipboardList } from "lucide-react";
import { bookingService } from "@/app/services/bookingService";
import Image from "next/image";

// Hàm tự động sinh danh sách các mốc giờ cách nhau 15 phút (từ 09:00 đến 23:45)
const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 23; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const hStr = hour.toString().padStart(2, "0");
            const mStr = minute.toString().padStart(2, "0");
            slots.push(`${hStr}:${mStr}`);
        }
    }
    return slots;
};

export default function BookingPage() {
    // State quản lý chuyển đổi Tab: 'booking' hoặc 'pricelist'
    const [activeTab, setActiveTab] = useState<"booking" | "pricelist">("booking");

    // 1. STATE THÔNG TIN LIÊN LẠC (BỔ SUNG CHO ĐÚNG SCHEMA DATABASE)
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    // Quản lý State cho Form đặt phòng
    const [branch, setBranch] = useState("Muzic Box Phan Xích Long, Q.Phú Nhuận");
    const [roomType, setRoomType] = useState("boxS"); // Đồng bộ enum: ['boxS', 'boxM' , 'nintendo']
    const [date, setDate] = useState(new Date().toLocaleDateString('sv-SE'));
    const [time, setTime] = useState(`${(new Date().getHours() + 1).toString().padStart(2, '0')}:00`);
    const [duration, setDuration] = useState("60");

    // State quản lý UI thông báo trạng thái gửi API
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Trạng thái đóng/mở của Custom Time Picker
    const [isOpenTimePicker, setIsOpenTimePicker] = useState(false);

    const timeSlots = generateTimeSlots();
    const timePickerRef = useRef<HTMLDivElement>(null);

    // Xử lý click ra ngoài để đóng Dropdown chọn giờ
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) {
                setIsOpenTimePicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Cấu hình dữ liệu giá chuẩn theo đúng Model Mongoose khớp với ảnh "nori-banggia.jpg"
    const priceMatrix: Record<string, { morning: number; afternoon: number; evening: number }> = {
        boxS: {
            morning: 39000,   // Khung sáng (8h - 13h)
            afternoon: 59000, // Khung chiều (13h - 18h)
            evening: 79000    // Khung tối (18h - 23h)
        },
        boxM: {
            morning: 59000,
            afternoon: 79000,
            evening: 99000
        },
        nintendo: {
            morning: 25000,   // Dựa trên ảnh: 1 tay cầm cố định 25k/1h
            afternoon: 25000,
            evening: 25000
        }
    };

    // Hàm tính giá tiền tạm tính dựa trên cấu trúc schema mới
    const calculatePrice = () => {
        const hour = parseInt(time.split(":")[0]);
        let timeSlot: "morning" | "afternoon" | "evening" = "evening";

        // Xác định khung giờ dựa vào định nghĩa trong DB: Sáng(8-13), Chiều(13-18), Tối(18-23)
        if (hour >= 8 && hour < 13) {
            timeSlot = "morning";
        } else if (hour >= 13 && hour < 18) {
            timeSlot = "afternoon";
        } else {
            timeSlot = "evening";
        }

        // Lấy giá cơ sở theo giờ từ ma trận cấu hình
        const targetRates = priceMatrix[roomType] || priceMatrix["boxS"];
        const ratePerHour = targetRates[timeSlot];

        // Thành tiền = Giá theo giờ * (Số phút / 60)
        const totalPrice = ratePerHour * (parseInt(duration) / 60);
        return totalPrice.toLocaleString("vi-VN");
    };

    // 2. HÀM XỬ LÝ SUBMIT GỬI DỮ LIỆU SANG NODEJS BACKEND
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Kiểm tra validation dữ liệu cơ bản ở FE
        if (!customerName.trim() || !customerPhone.trim()) {
            setMessage({ type: "error", text: "Vui lòng nhập Tên và Số điện thoại để NORI giữ chỗ nha!" });
            return;
        }

        setLoading(true);
        try {
            // Tính toán endTime dự tính dựa vào duration để khớp dữ liệu lưu trữ
            const [startHour, startMin] = time.split(":").map(Number);
            const totalMinutes = startHour * 60 + startMin + parseInt(duration);
            const endHour = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
            const endMin = (totalMinutes % 60).toString().padStart(2, "0");
            const endTime = `${endHour}:${endMin}`;

            // Gửi dữ liệu qua REST API bằng fetch
            const response = await bookingService.create({
                customerName,
                customerPhone,
                roomType, // Được map sang kiểu dữ liệu 'room' trong DB
                bookingDate: date,
                startTime: time,
                endTime: endTime
            })

            if (response) {
                setMessage({ type: "success", text: "Đặt phòng thành công." });
                // Reset form sau khi đặt thành công nếu muốn
                setCustomerName("");
                setCustomerPhone("");
            } else {
                setMessage({ type: "error", text: "Có lỗi xảy ra khi đặt chỗ." });
            }
        } catch (error: any) {
            if (error.response && error.response.data) {
                const backendMessage = error.response.data.message;
                setMessage({
                    type: "error",
                    text: backendMessage || "Có lỗi xảy ra khi đặt chỗ."
                });
            } else {
                // Lỗi kết nối mạng hoặc lỗi hệ thống 
                setMessage({
                    type: "error",
                    text: "Hệ thống đang gặp lỗi. Bạn đặt lịch qua zalo giúp NORI nha: 0393.713.910"
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8 flex items-center justify-center">
            <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 animate-in fade-in zoom-in-95 duration-300">

                {/* ================= CỘT TRÁI: BANNER THƯƠNG HIỆU ================= */}
                <div className="lg:col-span-4 bg-linear-to-br from-blue-800 via-blue-400 to-blue-600 p-8 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px] z-0"></div>

                    <div className="relative z-10 space-y-6">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-white">
                                NORI Zone Entertainment
                            </span>
                            <h1 className="text-4xl font-black tracking-tight mt-4 drop-shadow-sm">
                                NORI ZONE
                            </h1>
                        </div>

                        <p className="text-sm text-purple-50 leading-relaxed font-light">
                            Không còn những định nghĩa cũ kỹ về phòng hát, NoriZone mang đến làn gió mới với mô hình mini box. Riêng tư cho các cặp doi, vừa vặn cho nhóm bạn – nơi có chất âm đỉnh cao và những góc check-in lung linh đang chờ bạn khám phá.
                        </p>

                        <blockquote className="border-l-2 border-pink-400 pl-3 text-xs italic">
                            &quot;Gạt hết âu lo, Tự do thể hiện&quot;
                        </blockquote>
                    </div>

                    <div className="relative z-10 mt-12 pt-6 border-t border-white/20 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                            <HelpCircle size={14} /> Hỗ trợ
                        </p>
                        <div className="flex items-center gap-2.5 text-xs bg-white/10 p-3 rounded-xl border border-white/10 hover:bg-white/15 transition cursor-pointer">
                            <Mail size={14} className="text-pink-300 shrink-0" />
                            <span className="font-mono tracking-tight text-white/90">norizone29@gmail.com</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs bg-white/10 p-3 rounded-xl border border-white/10 hover:bg-white/15 transition cursor-pointer">
                            <Phone size={14} className="text-pink-300 shrink-0" />
                            <span className="font-mono tracking-tight text-white/90">0393713910</span>
                        </div>
                    </div>
                </div>

                {/* ================= CỘT PHẢI: KHU VỰC CHỨA TABS (FORM & BẢNG GIÁ) ================= */}
                <div className="lg:col-span-8 p-6 md:p-8 flex flex-col justify-between bg-white">

                    {/* Thanh Tab Chuyển Đổi Hiện Đại */}
                    <div className="flex border-b border-slate-200 gap-2 mb-6">
                        <button
                            type="button"
                            onClick={() => setActiveTab("booking")}
                            className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-all ${activeTab === "booking"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                        >
                            <ClipboardList size={16} />
                            Đặt phòng trực tuyến
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("pricelist")}
                            className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-all ${activeTab === "pricelist"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                        >
                            <Ticket size={16} />
                            Bảng giá dịch vụ
                        </button>
                    </div>

                    {/* Hiển thị thông báo trạng thái của API */}
                    {message && activeTab === "booking" && (
                        <div className={`mb-4 p-4 rounded-xl text-sm font-bold ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* NỘI DUNG TAB 1: FORM ĐẶT PHÒNG */}
                    {activeTab === "booking" && (
                        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
                            <div className="space-y-4">
                                {/* Khối thông tin liên hệ */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tên của bạn</label>
                                        <input
                                            type="text"
                                            placeholder="Nhập tên của bạn"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Số điện thoại</label>
                                        <input
                                            type="tel"
                                            placeholder="Nhập số điện thoại"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition"
                                        />
                                    </div>
                                </div>

                                {/* Chọn Cơ sở */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Chi nhánh</label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-3 top-3.5 text-slate-400" />
                                        <select
                                            value={branch}
                                            onChange={(e) => setBranch(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-3 text-sm font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 transition cursor-pointer"
                                        >
                                            <option>30 Hùng Vương - Xã Đức Trọng - Lâm Đồng</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Chọn Loại Phòng */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Chọn dịch vụ</label>
                                    <div className="relative">
                                        <Users size={16} className="absolute left-3 top-3.5 text-slate-400" />
                                        <select
                                            value={roomType}
                                            onChange={(e) => setRoomType(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-3 text-sm font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 transition cursor-pointer"
                                        >
                                            <option value="boxS">BOX S (1-3 người)</option>
                                            <option value="boxM">BOX M (4-8 người)</option>
                                            <option value="nintendo">Chơi Nintendo Switch</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Chọn Ngày & Giờ/Thời lượng */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Chọn ngày</label>
                                        <div className="relative">
                                            <Calendar size={16} className="absolute left-3 top-3.5 text-slate-400" />
                                            <input
                                                type="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Giờ & Lượng hát</label>
                                        <div className="flex gap-2">
                                            <div className="w-1/2 relative" ref={timePickerRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsOpenTimePicker(!isOpenTimePicker)}
                                                    className={`w-full bg-slate-50 border rounded-xl pl-9 pr-2 py-3 text-sm font-bold text-slate-700 text-left flex items-center justify-between transition focus:outline-none ${isOpenTimePicker ? "border-purple-500 ring-2 ring-purple-500/10 bg-white" : "border-slate-200 hover:bg-slate-100/70"}`}
                                                >
                                                    <Clock size={15} className="absolute left-3 text-slate-400" />
                                                    <span>{time}</span>
                                                    <ChevronDown size={12} className={`text-slate-400 transition-transform ${isOpenTimePicker ? "rotate-180" : ""}`} />
                                                </button>

                                                {isOpenTimePicker && (
                                                    <div className="absolute left-0 z-30 mt-2 w-48 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                                        <div className="max-h-56 overflow-y-auto grid grid-cols-2 gap-1 p-2 bg-white">
                                                            {timeSlots.map((slot) => (
                                                                <button
                                                                    key={slot}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setTime(slot);
                                                                        setIsOpenTimePicker(false);
                                                                    }}
                                                                    className={`py-1.5 text-xs font-mono font-bold rounded-lg text-center transition ${time === slot ? "bg-purple-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
                                                                >
                                                                    {slot}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="w-1/2 relative">
                                                <select
                                                    value={duration}
                                                    onChange={(e) => setDuration(e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 appearance-none focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition cursor-pointer"
                                                >
                                                    <option value="45">45 phút</option>
                                                    <option value="60">1 tiếng</option>
                                                    <option value="90">1.5 tiếng</option>
                                                    <option value="120">2 tiếng</option>
                                                    <option value="180">3 tiếng</option>
                                                </select>
                                                <ChevronDown size={12} className="absolute right-3 top-4 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Thanh toán và Submit nút */}
                            <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="text-center sm:text-left">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Số tiền cần thanh toán (Tạm tính)</p>
                                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                                        {calculatePrice()} VND
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-400 text-white font-bold px-10 py-4 rounded-xl text-sm transition shadow-xl shadow-purple-200/80 ${loading ? "opacity-50 cursor-not-allowed" : "hover:opacity-95 active:scale-[0.98]"}`}
                                >
                                    {loading ? "Đang gửi lịch..." : "Tiến hành Đặt Phòng"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* NỘI DUNG TAB 2: BẢNG GIÁ ẢNH NGAU */}
                    {activeTab === "pricelist" && (
                        <div className="space-y-4 flex-1 flex flex-col justify-between animate-in fade-in duration-200">
                            <div className="w-full overflow-hidden border border-slate-100 rounded-xl bg-slate-50 p-2 flex items-center justify-center">
                                <Image
                                    src="/images/nori-banggia.jpg"
                                    alt="bang-gia"
                                    className="w-full h-auto object-contain max-h-105"
                                    width={1200}
                                    height={600}
                                    priority
                                />
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <p className="text-[11px] text-slate-400 max-w-md leading-relaxed">
                                    * Bảng giá áp dụng theo khung giờ và loại dịch vụ. Bạn có thể chuyển sang Tab Đặt Phòng để xem chi tiết giá tạm tính tự động.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("booking")}
                                    className="text-xs font-bold text-blue-600 hover:underline shrink-0"
                                >
                                    Đặt phòng &rarr;
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}