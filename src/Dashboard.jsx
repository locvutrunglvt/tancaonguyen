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
                .from('profiles')
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
        <div className="dashboard-container fade-up space-y-6">
            <header className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="space-y-1">
                    <p className="tech-label-pro">
                        <i className="fas fa-user-shield coffee-accent"></i> [ AUTH_LEVEL: MASTER_ACCESS ]
                    </p>
                    <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tighter">
                        Hệ thống Điều hành
                    </h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadData} className="w-12 h-12 flex items-center justify-center bg-white text-slate-900 border-2 border-slate-900 hover:bg-slate-50 transition-all">
                        <i className="fas fa-sync-alt"></i>
                    </button>
                    <button onClick={handleLogout} className="w-12 h-12 flex items-center justify-center bg-white text-red-600 border-2 border-red-200 hover:bg-red-600 hover:text-white transition-all">
                        <i className="fas fa-power-off"></i>
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 bg-white border-2 border-slate-900 relative">
                    <p className="tech-label-pro mb-2">
                        <i className="fas fa-users coffee-accent"></i> DATA_01: TOTAL_CREDENTIALS
                    </p>
                    <h3 className="text-5xl font-bold text-slate-900 tracking-tighter">
                        {loading ? '--' : stats.total}
                    </h3>
                </div>
                <div className="p-6 bg-white border-2 border-slate-900 relative">
                    <p className="tech-label-pro mb-2">
                        <i className="fas fa-microchip coffee-accent"></i> DATA_02: CORE_UPTIME
                    </p>
                    <h3 className="text-5xl font-bold text-slate-900 tracking-tighter">99.9%</h3>
                </div>
            </div>

            <div className="pro-card p-0 overflow-hidden">
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                    <p className="tech-label-pro text-slate-300">
                        <i className="fas fa-stream text-emerald-500"></i> [ LIVE_STORAGE_NODES ]
                    </p>
                    <span className="text-[9px] font-mono animate-pulse">● SYNC_ACTIVE</span>
                </div>
                <div className="divide-y-2 divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-20 tech-label-pro italic">REQUESTING_DATA_NODES...</div>
                    ) : profiles.length === 0 ? (
                        <div className="text-center py-20 tech-label-pro italic">NO_DATA_AVAILABLE</div>
                    ) : (
                        profiles.map(p => (
                            <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 flex items-center justify-center bg-slate-100 border border-slate-200 text-slate-900 font-bold text-sm">
                                        {p.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 uppercase">{p.full_name}</p>
                                        <p className="tech-label-pro text-[9px] mt-0.5">
                                            {p.organization} | <span className="font-mono text-slate-400">#{p.id.slice(0, 8).toUpperCase()}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="tech-label-pro text-[9px] bg-slate-900 text-white px-2 py-0.5 mb-1 inline-block">{p.role}</span>
                                    <p className="text-[8px] font-mono text-emerald-600 font-bold">NODE_ACTIVE</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
