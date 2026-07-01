"use client";
import React, { useState, useEffect } from "react";
import {
    RefreshCw, ChevronRight, Search, Filter, Plus,
    Utensils, Coffee, Layers, Package,
    Edit2, Trash2, CheckCircle, XCircle, X, MoreVertical
} from "lucide-react";
import { menuService } from "@/app/services/menuService";

interface MenuItem {
    _id: string;
    name: string;
    category: "food" | "drink" | "combo" | "service";
    price: number;
    stock: number;
    isAvailable: boolean;
}

const CATEGORY_MAP: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; borderHighlight: string }> = {
    food: { label: "Món ăn", icon: <Utensils size={14} />, color: "text-orange-600", bg: "bg-orange-50 border-orange-100", borderHighlight: "border-t-4 border-t-orange-500" },
    drink: { label: "Nước uống", icon: <Coffee size={14} />, color: "text-blue-600", bg: "bg-blue-50 border-blue-100", borderHighlight: "border-t-4 border-t-blue-500" },
    combo: { label: "Combo", icon: <Layers size={14} />, color: "text-purple-600", bg: "bg-purple-50 border-purple-100", borderHighlight: "border-t-4 border-t-purple-500" },
    service: { label: "Dịch vụ", icon: <Layers size={14} />, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100", borderHighlight: "border-t-4 border-t-indigo-500" },
};

export default function MenuManagement() {
    const [menuList, setMenuList] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState("all");

    // Quản lý đóng/mở menu hành động nhanh trên mobile cho từng card
    const [mobileMenuOpen, setMobileMenuOpen] = useState<string | null>(null);

    // States phục vụ cho Modal "Thêm món mới"
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        category: "food",
        price: "",
        stock: "",
        isAvailable: true
    });

    const fetchMenu = async () => {
        setLoading(true);
        try {
            const res = await menuService.getAll();
            if (res) {
                setMenuList(res);
            } else {
                throw new Error();
            }
        } catch (error) {
            setMenuList([
                { _id: "M1", name: "Mì xào bò xúc xích", category: "food", price: 45000, stock: 50, isAvailable: true },
                { _id: "M2", name: "Coca Cola lon", category: "drink", price: 20000, stock: 120, isAvailable: true },
                { _id: "M3", name: "Cà phê sữa đá", category: "drink", price: 25000, stock: 0, isAvailable: true },
                { _id: "M4", name: "Combo Karaoke Đêm (3 Bia + 1 Khô mực)", category: "combo", price: 289000, stock: 10, isAvailable: false },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();
    }, []);

    const handleCreateMenu = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.price) {
            alert("Vui lòng điền đầy đủ Tên món và Giá tiền!");
            return;
        }

        setSubmitLoading(true);
        try {
            const payload = {
                name: formData.name.trim(),
                category: formData.category,
                price: Number(formData.price),
                stock: Number(formData.stock) || 0,
                isAvailable: formData.isAvailable
            };

            await menuService.create(payload);
            setFormData({ name: "", category: "food", price: "", stock: "", isAvailable: true });
            setIsModalOpen(false);
            fetchMenu();
        } catch (error: any) {
            alert(error?.message || "Có lỗi xảy ra khi thêm món mới.");
        } finally {
            setSubmitLoading(false);
        }
    };

    const filteredMenu = menuList.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = filterCategory === "all" || item.category === filterCategory;
        return matchSearch && matchCategory;
    });

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
            {/* Header đồng bộ - Tự động thu gọn khoảng cách trên mobile */}
            <header className="bg-white border-b border-slate-200 px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-slate-500 min-w-0 flex-1">
                    <span className="font-medium text-slate-600 hidden sm:inline">NORI Workspace</span>
                    <ChevronRight size={12} className="text-slate-300 hidden sm:block shrink-0" />
                    <span className="text-indigo-600 bg-indigo-50 px-1.5 sm:px-2 py-0.5 rounded-md border border-indigo-100 font-medium truncate">
                        Danh sách menu
                    </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={fetchMenu}
                        className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] sm:text-xs font-semibold text-slate-700 transition-all active:scale-95 shadow-sm"
                    >
                        <RefreshCw size={12} className={`text-slate-500 shrink-0 ${loading ? "animate-spin text-indigo-600" : ""}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                        <Plus size={12} /> <span>Thêm món</span>
                    </button>
                </div>
            </header>

            {/* Khung nội dung chính */}
            <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-full w-full mx-auto space-y-4 sm:space-y-6 pb-12">

                {/* Thanh điều khiển lọc dữ liệu thông minh - Chuyển sang dạng dọc trên mobile */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row gap-2.5 items-center justify-between shadow-sm">
                    <div className="relative w-full sm:w-80">
                        <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm tên món ăn, nước uống..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    <div className="w-full sm:w-auto">
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 w-full justify-between sm:justify-start">
                            <div className="flex items-center gap-1.5">
                                <Filter size={13} className="text-slate-400" />
                                <span className="sm:hidden font-medium text-slate-500">Bộ lọc:</span>
                            </div>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="bg-transparent font-semibold focus:outline-none cursor-pointer text-right sm:text-left text-slate-700"
                            >
                                <option value="all">Tất cả danh mục</option>
                                <option value="food">Món ăn (Food)</option>
                                <option value="drink">Thức uống (Drink)</option>
                                <option value="combo">Gói Combo</option>
                                <option value="service">Dịch vụ</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Bảng danh sách menu chính - ẨN TRÊN MOBILE, CHỈ HIỂN THỊ TRÊN DESKTOP */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-6">Tên mặt hàng</th>
                                    <th className="py-3 px-6">Phân loại</th>
                                    <th className="py-3 px-6">Giá niêm yết</th>
                                    <th className="py-3 px-6">Kho hàng</th>
                                    <th className="py-3 px-6">Trạng thái kinh doanh</th>
                                    <th className="py-3 px-6 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                {filteredMenu.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">Không tìm thấy sản phẩm nào trong menu.</td>
                                    </tr>
                                ) : (
                                    filteredMenu.map((item) => {
                                        const catConfig = CATEGORY_MAP[item.category];
                                        return (
                                            <tr key={item._id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                                                <td className="py-4 px-6 font-semibold text-slate-900 text-sm">{item.name}</td>
                                                <td className="py-4 px-6">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${catConfig?.bg} ${catConfig?.color}`}>
                                                        {catConfig?.icon}
                                                        {catConfig?.label}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 font-bold text-slate-900 text-sm">{item.price.toLocaleString()}đ</td>
                                                <td className="py-4 px-6 font-medium">
                                                    <div className="flex items-center gap-1.5 text-slate-700">
                                                        <Package size={13} className="text-slate-400" />
                                                        {item.stock > 0 ? (
                                                            <span>{item.stock} cái</span>
                                                        ) : (
                                                            <span className="text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Hết hàng</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    {item.isAvailable ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                            <CheckCircle size={12} className="text-emerald-500" /> Đang hiển thị
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                                            <XCircle size={12} className="text-slate-400" /> Đang ẩn menu
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex gap-2 items-center justify-end">
                                                        <button className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm" title="Sửa thông tin">
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button className="p-1.5 rounded-md border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Xóa mặt hàng">
                                                            <Trash2 size={13} />
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

                {/* ── INTERFACE MOBILE CARD VIEW (Phát triển theo cấu trúc phẳng từ ảnh mẫu) ── */}
                <div className="md:hidden bg-slate-100/60 p-1.5 rounded-xl space-y-3">
                    {filteredMenu.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 font-medium text-xs bg-white rounded-xl border border-slate-200">
                            Không tìm thấy sản phẩm nào.
                        </div>
                    ) : (
                        filteredMenu.map((item) => {
                            const catConfig = CATEGORY_MAP[item.category];
                            return (
                                <div
                                    key={item._id}
                                    className={`bg-white rounded-xl shadow-xs p-4 flex flex-col justify-between relative overflow-hidden border border-slate-200/60 ${catConfig?.borderHighlight} transition-all duration-200`}
                                >
                                    {/* Hàng 1: Tên mặt hàng & Dropdown hành động */}
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-slate-900 text-sm tracking-tight leading-snug line-clamp-2">
                                                {item.name}
                                            </h4>
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${catConfig?.bg} ${catConfig?.color}`}>
                                                    {catConfig?.icon}
                                                    {catConfig?.label}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Nút Ba chấm - Thao tác nhanh gọn gàng */}
                                        <div className="relative shrink-0 ml-2">
                                            <button
                                                type="button"
                                                onClick={() => setMobileMenuOpen(mobileMenuOpen === item._id ? null : item._id)}
                                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition active:scale-90"
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {mobileMenuOpen === item._id && (
                                                <div className="absolute right-0 top-7 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-32 z-30 animate-in fade-in zoom-in-95 duration-100">
                                                    <button onClick={() => setMobileMenuOpen(null)} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                                        <Edit2 size={12} /> Sửa thông tin
                                                    </button>
                                                    <button onClick={() => setMobileMenuOpen(null)} className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border-t border-slate-100 flex items-center gap-2">
                                                        <Trash2 size={12} /> Xóa món
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hàng 2: Giá cả & Kho hàng phụ */}
                                    <div className="mt-4 pt-3 border-t border-dashed border-slate-100 flex items-center justify-between">
                                        <div className="text-slate-900 font-extrabold text-base tracking-tight">
                                            {item.price.toLocaleString()}đ
                                        </div>

                                        <div className="flex items-center gap-2 text-xs">
                                            {/* Badge trạng thái kho */}
                                            <div className="flex items-center gap-1 text-slate-500 font-medium">
                                                <Package size={12} className="text-slate-400" />
                                                {item.stock > 0 ? (
                                                    <span>Kho: <strong className="text-slate-800">{item.stock}</strong></span>
                                                ) : (
                                                    <span className="text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded text-[10px]">Hết hàng</span>
                                                )}
                                            </div>

                                            {/* Badge trạng thái kinh doanh */}
                                            {item.isAvailable ? (
                                                <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-[10px]">
                                                    Hiện
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-0.5 text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 text-[10px]">
                                                    Ẩn
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* --- DIALOG / MODAL THÊM MÓN MỚI (Tương thích chiều rộng Mobile) --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
                            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                                <Plus size={15} className="text-indigo-600" />
                                Thêm món mới vào thực đơn
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <form onSubmit={handleCreateMenu} className="p-4 sm:p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tên sản phẩm/Combo *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Trà sữa trân châu hoàng kim"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phân loại *</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                                    >
                                        <option value="food">Món ăn (Food)</option>
                                        <option value="drink">Thức uống (Drink)</option>
                                        <option value="combo">Gói Combo</option>
                                        <option value="service">Dịch vụ</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Giá bán (đ) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        placeholder="0"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Số lượng nhập kho ban đầu</label>
                                <div className="relative">
                                    <Package size={13} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Để trống nếu không giới hạn số lượng"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                                <div className="flex flex-col min-w-0 pr-2">
                                    <span className="text-xs font-bold text-slate-700">Trạng thái hiển thị</span>
                                    <span className="text-[10px] text-slate-400 truncate">Cho phép gọi món này ngay khi tạo</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shrink-0 ${formData.isAvailable ? "bg-indigo-600" : "bg-slate-200"}`}
                                >
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.isAvailable ? "translate-x-4" : "translate-x-0"}`} />
                                </button>
                            </div>

                            {/* Modal Footer Actions - Đổi vị trí kéo dài nút bấm trên Mobile */}
                            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 sticky bottom-0 bg-white">
                                <button
                                    type="button"
                                    disabled={submitLoading}
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition active:scale-95 disabled:opacity-50"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitLoading}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
                                >
                                    {submitLoading ? "Đang xử lý..." : "Lưu mặt hàng"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}