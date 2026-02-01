import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const Dashboard = () => {
    const [profiles, setProfiles] = useState([]);
    const [stats, setStats] = useState({ total: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('users') // Updated from profiles to users
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfiles(data || []);
            setStats({ total: data?.length || 0 });
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="min-h-screen bg-[#f0f9ff] font-sans">
            {/* Soft Header with Gradient and Logos */}
            <div className="bg-white border-b border-[#e0f2fe] px-6 py-4 shadow-sm">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <img src="https://raw.githubusercontent.com/locvutrunglvt/Tancaonguyen/refs/heads/main/tancaonguyen_old/TCN%20logo.jpg" alt="TCN" className="h-8" />
                        <h1 className="text-xl font-extrabold text-[#451a03] tracking-tight hidden md:block">
                            DAKLACK <span className="text-[#78350f]">MANAGEMENT</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-[#e0f2fe] text-[#78350f] text-[10px] font-bold rounded-full">
                            VER 2.4.0
                        </span>
                        <button
                            onClick={handleLogout}
                            className="bg-[#451a03] hover:bg-[#78350f] text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-6xl mx-auto p-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f2fe]">
                        <p className="text-[#b45309] text-xs font-bold uppercase tracking-wider mb-1">Tổng nhân sự</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-[#451a03]">{stats.total}</span>
                            <span className="text-[#10b981] text-xs font-bold">Thành viên</span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0f2fe]">
                        <p className="text-[#b45309] text-xs font-bold uppercase tracking-wider mb-1">Trạng thái hệ thống</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-[#451a03]">99.9%</span>
                            <span className="text-[#10b981] text-xs font-bold">Ổn định</span>
                        </div>
                    </div>
                </div>

                {/* User List */}
                <div className="bg-white rounded-3xl shadow-sm border border-[#e0f2fe] overflow-hidden">
                    <div className="p-6 border-b border-[#f0f9ff] flex justify-between items-center bg-[#f0f9ff]/50">
                        <h2 className="text-lg font-bold text-[#451a03]">Danh sách nhân sự</h2>
                        <button
                            onClick={loadData}
                            className="text-[#78350f] hover:text-[#451a03] text-sm font-bold p-2 transition-colors"
                        >
                            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                        </button>
                    </div>

                    <div className="divide-y divide-[#f0f9ff]">
                        {profiles.length > 0 ? (
                            profiles.map((p) => (
                                <div key={p.id} className="p-4 hover:bg-[#f0f9ff]/30 transition-colors flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[#e0f2fe] rounded-2xl flex items-center justify-center text-[#78350f] font-bold">
                                            {p.full_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#451a03]">{p.full_name}</p>
                                            <p className="text-xs text-[#78350f]/70">
                                                {p.organization} • {p.phone || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${p.role === 'Admin' ? 'bg-[#10b981]/10 text-[#059669]' : 'bg-[#e0f2fe] text-[#78350f]'
                                            }`}>
                                            {p.role}
                                        </span>
                                        <p className="text-[10px] font-mono text-[#bae6fd] mt-1">UUID: {p.id.slice(0, 8)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-[#bae6fd] italic">
                                {loading ? 'Đang đọc dữ liệu...' : 'Không tìm thấy dữ liệu.'}
                            </div>
                        )}
                    </div>
                </div>

                <footer className="mt-8 text-center">
                    <div className="flex justify-center gap-8 mb-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                        <img src="https://logos-world.net/wp-content/uploads/2023/03/Tchibo-Logo.jpg" alt="Tchibo" className="h-6" />
                        <img src="https://nkgvietnam.com/wp-content/uploads/2023/05/NKG-Vietnam_Logo_left-1-01.svg" alt="NKG" className="h-6" />
                    </div>
                    <p className="text-[10px] text-[#bae6fd] font-mono tracking-widest uppercase">
                        &copy; 2026 TCN_CORE // TRUY CẬP ĐÃ ĐƯỢC XÁC THỰC
                    </p>
                </footer>
            </main>
        </div>
    );
};

export default Dashboard;
