import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './Dashboard.css';

const Dashboard = () => {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadData();
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('User')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfiles(data || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const menuItems = [
        {
            id: 'model',
            title: 'Quản lý mô hình',
            desc: 'Quản lý các nông hộ hình mẫu và kịch bản thích ứng biến đổi khí hậu.',
            icon: 'fas fa-seedling',
            color: 'emerald'
        },
        {
            id: 'assets',
            title: 'Quản lý tài sản',
            desc: 'Theo dõi thiết bị, quỹ đất và tài nguyên hệ thống nông hộ.',
            icon: 'fas fa-boxes',
            color: 'blue'
        },
        {
            id: 'users',
            title: 'Quản lý người dùng',
            desc: 'Quản lý tài khoản nhân viên, phân quyền và lịch sử truy cập.',
            icon: 'fas fa-users-cog',
            color: 'indigo'
        },
        {
            id: 'trading',
            title: 'Mua bán',
            desc: 'Hệ thống giao dịch nông sản, quản lý kho và chuỗi cung ứng.',
            icon: 'fas fa-shopping-cart',
            color: 'amber'
        },
        {
            id: 'settings',
            title: 'Thiết lập',
            desc: 'Cấu hình hệ thống, thông số kỹ thuật và tùy chỉnh giao diện.',
            icon: 'fas fa-sliders-h',
            color: 'slate'
        }
    ];

    return (
        <div className="dashboard-layout">
            {/* Sidebar Navigation */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <img src="https://raw.githubusercontent.com/locvutrunglvt/Tancaonguyen/refs/heads/main/tancaonguyen_old/TCN%20logo.jpg" alt="TCN" />
                    <span>TCN CORE</span>
                </div>

                <nav className="nav-menu">
                    <a className="nav-item active">
                        <i className="fas fa-home"></i>
                        <span>Tổng quát</span>
                    </a>
                    <a className="nav-item">
                        <i className="fas fa-chart-line"></i>
                        <span>Báo cáo</span>
                    </a>
                    <a className="nav-item">
                        <i className="fas fa-map-marked-alt"></i>
                        <span>Bản đồ</span>
                    </a>
                    <a className="nav-item">
                        <i className="fas fa-database"></i>
                        <span>Dữ liệu</span>
                    </a>
                </nav>

                <div className="sidebar-footer">
                    <div onClick={handleLogout} className="logout-btn">
                        <i className="fas fa-sign-out-alt"></i>
                        <span>Đăng xuất</span>
                    </div>
                </div>
            </aside>

            {/* Main Workspace */}
            <main className="main-content">
                <header className="header-top">
                    <div className="welcome-section">
                        <h2>Xin chào, {user?.email?.split('@')[0] || 'Admin'}</h2>
                        <p>Chào mừng bạn trở lại hệ thống quản lý TCN.</p>
                    </div>
                    <div className="header-meta">
                        <span className="px-4 py-2 bg-white border border-[#e0f2fe] text-[#78350f] text-xs font-bold rounded-2xl shadow-sm">
                            Hệ thống ổn định: 99.9%
                        </span>
                    </div>
                </header>

                {/* Home Menu Grid */}
                <div className="home-menu-grid">
                    {menuItems.map(item => (
                        <div key={item.id} className="menu-card">
                            <div className="card-icon">
                                <i className={item.icon}></i>
                            </div>
                            <div className="card-info">
                                <h3>{item.title}</h3>
                                <p>{item.desc}</p>
                            </div>
                            <div className="card-action">
                                Truy cập ngay <i className="fas fa-arrow-right"></i>
                            </div>
                        </div>
                    ))}
                </div>

                <footer className="mt-12 text-center opacity-30 grayscale hover:opacity-100 transition-all duration-500">
                    <div className="flex justify-center gap-12 mb-6">
                        <img src="https://logos-world.net/wp-content/uploads/2023/03/Tchibo-Logo.jpg" alt="Tchibo" className="h-6" />
                        <img src="https://nkgvietnam.com/wp-content/uploads/2023/05/NKG-Vietnam_Logo_left-1-01.svg" alt="NKG" className="h-6" />
                    </div>
                    <p className="text-[10px] text-[#451a03] font-mono tracking-widest uppercase">
                        &copy; 2026 TAN CAO NGUYEN // ECOSYSTEM PLATFORM
                    </p>
                </footer>
            </main>
        </div>
    );
};

export default Dashboard;
