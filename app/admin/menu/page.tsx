"use client";
import React, { useState, useEffect } from "react";
import {
    RefreshCw, ChevronRight, Search, Filter, Plus,
    Utensils, Coffee, Layers, Package, SlidersHorizontal,
    Edit2, Trash2, CheckCircle, XCircle
} from "lucide-react";
import { menuService } from "@/app/services/menuService";

interface MenuItem {
    _id: string;
    name: string;
    category: "food" | "drink" | "combo";
    price: number;
    stock: number;
    isAvailable: boolean;
}

const CATEGORY_MAP: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    food: { label: "Món ăn", icon: <Utensils size={14} />, color: "text-orange-600", bg: "bg-orange-50 border-orange-100" },
    drink: { label: "Nước uống", icon: <Coffee size={14} />, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
    combo: { label: "Combo", icon: <Layers size={14} />, color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
};

export default function MenuManagement() {
    const [menuList, setMenuList] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState("all");

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
            // Mock data phòng hờ nếu API của bạn chưa có sẵn dữ liệu mẫu
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

                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95">
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
                                                {/* Tên sản phẩm */}
                                                <td className="py-4 px-6 font-semibold text-slate-900 text-sm">
                                                    {item.name}
                                                </td>

                                                {/* Phân loại danh mục */}
                                                <td className="py-4 px-6">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${catConfig?.bg} ${catConfig?.color}`}>
                                                        {catConfig?.icon}
                                                        {catConfig?.label}
                                                    </span>
                                                </td>

                                                {/* Đơn giá */}
                                                <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                                                    {item.price.toLocaleString()}đ
                                                </td>

                                                {/* Số lượng tồn kho */}
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

                                                {/* Trạng thái hiển thị bán hàng */}
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

                                                {/* Tác vụ chỉnh sửa nhanh */}
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex gap-2 items-center justify-end">
                                                        <button
                                                            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                                                            title="Sửa thông tin"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button
                                                            className="p-1.5 rounded-md border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                            title="Xóa mặt hàng"
                                                        >
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
        </>
    );
}