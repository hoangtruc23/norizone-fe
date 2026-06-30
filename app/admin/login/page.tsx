"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/app/services/authService";

export default function AdminLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await authService.login(username, password);
            router.replace("/admin");
        } catch (err: any) {
            setError(err.message || "Đăng nhập thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
                <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400">NORI ZONE</p>
                    <h1 className="mt-2 text-2xl font-bold text-white">Đăng nhập quản trị</h1>
                    <p className="mt-2 text-sm text-slate-400">Vui lòng đăng nhập để vào trang quản lý đặt phòng.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Username</label>
                        <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                            placeholder="Nhập Username"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                            placeholder="Nhập Password"
                        />
                    </div>

                    {error ? <p className="text-sm text-rose-400">{error}</p> : null}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
                    >
                        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                </form>
            </div>
        </div>
    );
}
