"use client";
import React, { useState, useEffect } from "react";
import {
    RefreshCw, ChevronRight, Search, Filter, Plus,
    Utensils, Coffee, Layers, Package,
    Edit2, Trash2, CheckCircle, XCircle, X
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

const CATEGORY_MAP: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    food: { label: "Món ăn", icon: <Utensils size={14} />, color: "text-orange-600", bg: "bg-orange-50 border-orange-100" },
    drink: { label: "Nước uống", icon: <Coffee size={14} />, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
    combo: { label: "Combo", icon: <Layers size={14} />, color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
    service: { label: "Dịch vụ", icon: <Layers size={14} />, color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
};

export default function MenuManagement() {
    const [menuList, setMenuList] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState("all");

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
            // Mock data phòng hờ nếu API chưa có sẵn dữ liệu mẫu
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

    // Xử lý gửi dữ liệu Form lên API
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

            // Reset form và đóng modal
            setFormData({ name: "", category: "food", price: "", stock: "", isAvailable: true });
            setIsModalOpen(false);

            // Tải lại danh sách mặt hàng mới
            fetchMenu();
        } catch (error: any) {
            alert(error?.message || "Có lỗi xảy ra khi thêm món mới.");
        } finally {
            setSubmitLoading(false);
        }
    };

    // Bộ lọc dữ liệu theo ô tìm kiếm và phân loại danh mục
    const filteredMenu = menuList.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = filterCategory === "all" || item.category === filterCategory;
        return matchSearch && matchCategory;
    });

    return (
        <>
            {/* Header đồng bộ với hệ thống */}
            <header className="bg-white border-b border-slate-200 px-8 h-16 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-600">NORI Workspace</span>
                    <ChevronRight size={14} className="text-slate-300" />
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 font-medium">
                        Danh sách menu
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchMenu}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all active:scale-95 shadow-sm"
                    >
                        <RefreshCw size={14} className={`text-slate-500 ${loading ? "animate-spin text-indigo-600" : ""}`} />
                        Làm mới dữ liệu
                    </button>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                        <Plus size={14} /> Thêm món mới
                    </button>
                </div>
            </header>

            {/* Khung nội dung chính */}
            <main className="flex-1 p-8 max-w-400 w-full mx-auto space-y-6">

                {/* Thanh điều khiển lọc dữ liệu thông minh */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
                    <div className="relative w-full sm:w-80">
                        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm tên món ăn, nước uống, combo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
                            <Filter size={13} className="text-slate-400" />
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="bg-transparent font-medium focus:outline-none cursor-pointer"
                            >
                                <option value="all">Tất cả danh mục</option>
                                <option value="food">Món ăn (Food)</option>
                                <option value="drink">Thức uống (Drink)</option>
                                <option value="combo">Gói Combo</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Bảng danh sách menu chính */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
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
                                        <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                                            Không tìm thấy sản phẩm nào trong menu.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMenu.map((item) => {
                                        const catConfig = CATEGORY_MAP[item.category];
                                        return (
                                            <tr key={item._id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                                                <td className="py-4 px-6 font-semibold text-slate-900 text-sm">
                                                    {item.name}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${catConfig?.bg} ${catConfig?.color}`}>
                                                        {catConfig?.icon}
                                                        {catConfig?.label}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                                                    {item.price.toLocaleString()}đ
                                                </td>
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
            </main>

            {/* --- DIALOG / MODAL THÊM MÓN MỚI --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                <Plus size={16} className="text-indigo-600" />
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
                        <form onSubmit={handleCreateMenu} className="p-6 space-y-4">
                            {/* Trường: Tên món */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Tên sản phẩm/Combo *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Trà sữa trân châu hoàng kim"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                                />
                            </div>

                            {/* Khối: Phân loại & Giá */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Phân loại *</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                                    >
                                        <option value="food">Món ăn (Food)</option>
                                        <option value="drink">Thức uống (Drink)</option>
                                        <option value="combo">Gói Combo</option>
                                        <option value="service">Dịch vụ</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Giá bán (đ) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        placeholder="0"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                                    />
                                </div>
                            </div>

                            {/* Trường: Số lượng tồn kho */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Số lượng nhập kho ban đầu</label>
                                <div className="relative">
                                    <Package size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Để trống nếu không giới hạn số lượng"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                                    />
                                </div>
                            </div>

                            {/* Trường: Trạng thái hiển thị */}
                            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700">Trạng thái hiển thị</span>
                                    <span className="text-[10px] text-slate-400">Cho phép gọi món này trên hệ thống ngay khi tạo</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.isAvailable ? "bg-indigo-600" : "bg-slate-200"
                                        }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.isAvailable ? "translate-x-4" : "translate-x-0"
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    disabled={submitLoading}
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition active:scale-95 disabled:opacity-50"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitLoading}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
                                >
                                    {submitLoading ? "Đang xử lý..." : "Lưu mặt hàng"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}