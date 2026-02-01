import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './Dashboard.css';

const Dashboard = () => {
    const [view, setView] = useState('home'); // 'home' or 'users'
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Form state for adding/editing users
    const [userForm, setUserForm] = useState({ id: '', email: '', full_name: '', organization: 'tcn', role: 'Viewer', employee_code: '', phone: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);

    useEffect(() => {
        checkUser();
    }, []);

    useEffect(() => {
        if (view === 'users') {
            fetchUsersList();
        }
    }, [view]);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
    };

    const fetchUsersList = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('User')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            alert(`FETCH_ERROR: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditing) {
                const { error } = await supabase
                    .from('User')
                    .update({
                        full_name: userForm.full_name,
                        organization: userForm.organization,
                        role: userForm.role,
                        employee_code: userForm.employee_code,
                        phone: userForm.phone
                    })
                    .eq('id', userForm.id);
                if (error) throw error;
            } else {
                // For a real app, you'd call a Supabase Edge Function to create an auth user
                // Here we just insert into our User table for demonstration of management
                const { error } = await supabase.from('User').insert([{
                    ...userForm,
                    id: crypto.randomUUID(), // Mocking ID for management-only entry
                    created_at: new Date().toISOString()
                }]);
                if (error) throw error;
            }
            setShowUserModal(false);
            fetchUsersList();
        } catch (error) {
            alert(`SAVE_ERROR: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('User').delete().eq('id', id);
            if (error) throw error;
            fetchUsersList();
        } catch (error) {
            alert(`DELETE_ERROR: ${error.message}`);
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
            icon: 'fas fa-seedling'
        },
        {
            id: 'assets',
            title: 'Quản lý tài sản',
            desc: 'Theo dõi thiết bị, quỹ đất và tài nguyên hệ thống nông hộ.',
            icon: 'fas fa-boxes'
        },
        {
            id: 'users',
            title: 'Quản lý người dùng',
            desc: 'Quản lý tài khoản nhân viên, phân quyền và lịch sử truy cập.',
            icon: 'fas fa-users-cog',
            action: () => setView('users')
        },
        {
            id: 'trading',
            title: 'Mua bán',
            desc: 'Hệ thống giao dịch nông sản, quản lý kho và chuỗi cung ứng.',
            icon: 'fas fa-shopping-cart'
        },
        {
            id: 'settings',
            title: 'Thiết lập',
            desc: 'Cấu hình hệ thống, thông số kỹ thuật và tùy chỉnh giao diện.',
            icon: 'fas fa-sliders-h'
        }
    ];

    const HomeView = () => (
        <div className="home-menu-grid">
            {menuItems.map(item => (
                <div key={item.id} className="menu-card" onClick={item.action || (() => alert('Tính năng đang phát triển'))}>
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
    );

    const UserManagementView = () => (
        <div className="view-container">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
                <button onClick={() => setView('home')} className="nav-item" style={{ width: 'auto', background: 'white' }}>
                    <i className="fas fa-arrow-left"></i> Quay lại Home
                </button>
                <button
                    onClick={() => {
                        setUserForm({ id: '', email: '', full_name: '', organization: 'tcn', role: 'Viewer', employee_code: '', phone: '' });
                        setIsEditing(false);
                        setShowUserModal(true);
                    }}
                    className="nav-item"
                    style={{ width: 'auto', background: 'var(--coffee-dark)', color: 'white' }}
                >
                    <i className="fas fa-plus"></i> Thêm người dùng
                </button>
            </div>

            <div className="data-table-container">
                <div className="table-header">
                    <h3>Danh sách người dùng hệ thống</h3>
                    <div className="badge">{users.length} thành viên</div>
                </div>
                <table className="pro-table">
                    <thead>
                        <tr>
                            <th>Họ và tên</th>
                            <th>Email / Tài khoản</th>
                            <th>Tổ chức</th>
                            <th>Vai trò</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td>
                                    <div style={{ fontWeight: 700 }}>{u.full_name}</div>
                                    <div style={{ fontSize: '11px', opacity: 0.6 }}>{u.employee_code || 'N/A'}</div>
                                </td>
                                <td>{u.email}</td>
                                <td><span className="badge-org">{u.organization?.toUpperCase()}</span></td>
                                <td>
                                    <span className={`role-badge role-${u.role?.toLowerCase()}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => {
                                                setUserForm(u);
                                                setIsEditing(true);
                                                setShowUserModal(true);
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--coffee-medium)', cursor: 'pointer' }}
                                        >
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Simple User Modal */}
            {showUserModal && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '40px', borderRadius: '30px', width: '100%', maxWidth: '500px' }}>
                        <h3 style={{ marginBottom: '25px', color: 'var(--coffee-dark)' }}>{isEditing ? 'Cập nhật người dùng' : 'Thêm người dùng mới'}</h3>
                        <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-group">
                                <label>Họ và tên</label>
                                <input className="input-pro" value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input className="input-pro" type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} disabled={isEditing} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Mã nhân viên</label>
                                    <input className="input-pro" value={userForm.employee_code} onChange={e => setUserForm({ ...userForm, employee_code: e.target.value })} placeholder="VD: TCN-001" />
                                </div>
                                <div className="form-group">
                                    <label>Số điện thoại</label>
                                    <input className="input-pro" value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} placeholder="09xx xxx xxx" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Tổ chức</label>
                                    <select className="input-pro" value={userForm.organization} onChange={e => setUserForm({ ...userForm, organization: e.target.value })}>
                                        <option value="tcn">Tần Cao Nguyên</option>
                                        <option value="tchibo">Tchibo</option>
                                        <option value="nkg">NKG</option>
                                        <option value="farmer">Nông hộ</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Vai trò</label>
                                    <select className="input-pro" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                                        <option value="Admin">Admin</option>
                                        <option value="Viewer">Viewer</option>
                                        <option value="Farmer">Farmer</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{isEditing ? 'Cập nhật' : 'Thêm mới'}</button>
                                <button type="button" onClick={() => setShowUserModal(false)} className="btn-primary" style={{ flex: 1, background: '#f1f5f9', color: '#475569' }}>Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="dashboard-layout">
            {/* Sidebar Navigation */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <span>DỰ ÁN TÂN CAO NGUYÊN</span>
                </div>

                <nav className="nav-menu">
                    <a className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
                        <i className="fas fa-home"></i>
                        <span>Tổng quát</span>
                    </a>
                    <a className={`nav-item ${view === 'users' ? 'active' : ''}`} onClick={() => setView('users')}>
                        <i className="fas fa-users-cog"></i>
                        <span>Người dùng</span>
                    </a>
                    <a className="nav-item">
                        <i className="fas fa-chart-line"></i>
                        <span>Báo cáo</span>
                    </a>
                    <a className="nav-item">
                        <i className="fas fa-map-marked-alt"></i>
                        <span>Bản đồ</span>
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
                    <div onClick={handleLogout} className="mobile-only-logout" style={{ marginRight: 'auto', cursor: 'pointer', display: 'none' }}>
                        <i className="fas fa-sign-out-alt" style={{ color: '#ef4444', fontSize: '20px' }}></i>
                    </div>
                    <div className="welcome-section">
                        <p>Tân Cao Nguyên xin chào,</p>
                        <h2>{currentUser?.email?.split('@')[0] || 'Quản trị viên'}</h2>
                    </div>
                </header>

                {/* Conditional Rendering of Views */}
                {view === 'home' ? <HomeView /> : <UserManagementView />}

                <footer className="dashboard-footer">
                    <div className="footer-logos">
                        <img src="https://logos-world.net/wp-content/uploads/2023/03/Tchibo-Logo.jpg" alt="Tchibo" />
                        <img src="https://nkgvietnam.com/wp-content/uploads/2023/05/NKG-Vietnam_Logo_left-1-01.svg" alt="NKG" />
                    </div>
                    <p className="copyright">
                        &copy; 2026 TAN CAO NGUYEN // ECOSYSTEM PLATFORM
                    </p>
                </footer>
            </main>
        </div>
    );
};

export default Dashboard;
