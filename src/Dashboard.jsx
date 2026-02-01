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
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Modern Header with Background Image */}
            <div className="relative h-48 bg-slate-900 overflow-hidden">
                <img
                    src="/anh-cafe.jpg"
                    alt="Coffee Background"
                    className="w-full h-full object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                    <div>
                        <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-widest rounded-full mb-2">
                            SYSTEM_DASHBOARD_V2
                        </span>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">
                            DAKLACK <span className="text-emerald-500">MANAGEMENT</span>
                        </h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            <main className="max-w-6xl mx-auto p-6 -mt-8 relative z-10">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Credentials</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">{stats.total}</span>
                            <span className="text-emerald-600 text-xs font-bold">Nodes Connected</span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Core Uptime</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">99.9%</span>
                            <span className="text-emerald-600 text-xs font-bold">Stable</span>
                        </div>
                    </div>
                </div>

                {/* User List */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <h2 className="text-lg font-bold text-slate-900">User Directory</h2>
                        <button
                            onClick={loadData}
                            className="text-emerald-600 hover:text-emerald-700 text-sm font-bold p-2 transition-colors"
                            title="Refresh Data"
                        >
                            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                        </button>
                    </div>

                    <div className="divide-y divide-slate-50">
                        {profiles.length > 0 ? (
                            profiles.map((p) => (
                                <div key={p.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold">
                                            {p.full_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">{p.full_name}</p>
                                            <p className="text-xs text-slate-500">
                                                {p.organization} • {p.phone || 'No Phone'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${p.role === 'Admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {p.role}
                                        </span>
                                        <p className="text-[10px] font-mono text-slate-300 mt-1">ID: {p.id.slice(0, 8)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-slate-400 italic">
                                {loading ? 'Fetching nodes...' : 'No data nodes found in core.'}
                            </div>
                        )}
                    </div>
                </div>

                <footer className="mt-8 text-center">
                    <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                        &copy; 2026 TCN_SYSTEMS // SECURE_ACCESS_GRANTED
                    </p>
                </footer>
            </main>
        </div>
    );
};

export default Dashboard;
