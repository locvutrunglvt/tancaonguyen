import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './Login.css';

const translations = {
    vi: {
        title: 'Quản lý nông hộ & Thích ứng biến đổi khí hậu',
        subtitle: '[ xác thực hệ thống ]',
        org: 'chọn tổ chức của bạn',
        username: 'chọn tài khoản người dùng',
        password: 'mật khẩu truy cập',
        login: 'đăng nhập hệ thống',
        signup: '[ đăng ký tài khoản mới ]',
        forgot: '[ quên mật khẩu? ]',
        back: '[ quay lại đăng nhập ]',
        register: 'tạo tài khoản',
        reset: 'gửi yêu cầu khôi phục',
        selectOrg: '-- chọn tổ chức --',
        selectUser: '-- chọn nhân viên --',
        verifying: 'đang xác thực...',
        loading: 'đang tải...',
        fullName: 'họ và tên',
        phone: 'số điện thoại',
        email: 'địa chỉ email',
        orgs: [
            { id: 'tcn', name: 'TAN_CAO_NGUYEN' },
            { id: 'tchibo', name: 'TCHIBO_VIETNAM' },
            { id: 'nkg', name: 'NKG_GROUP' },
            { id: 'farmer', name: 'MODEL_FARMER' }
        ]
    },
    en: {
        title: 'Farming Management & Climate Adaptation',
        subtitle: '[ system authorization ]',
        org: 'select your organization',
        username: 'select user credential',
        password: 'access password',
        login: 'authorize system access',
        signup: '[ create new account ]',
        forgot: '[ forgot password? ]',
        back: '[ back to login ]',
        register: 'create account',
        reset: 'request reset',
        selectOrg: '-- select organization --',
        selectUser: '-- select staff --',
        verifying: 'verifying...',
        loading: 'loading...',
        fullName: 'full name',
        phone: 'phone number',
        email: 'email address',
        orgs: [
            { id: 'tcn', name: 'TAN_CAO_NGUYEN' },
            { id: 'tchibo', name: 'TCHIBO_VIETNAM' },
            { id: 'nkg', name: 'NKG_GROUP' },
            { id: 'farmer', name: 'MODEL_FARMER' }
        ]
    }
};

const Login = () => {
    const [view, setView] = useState('login'); // 'login', 'register', 'forgot'
    const [lang, setLang] = useState('vi');
    const [formData, setFormData] = useState({
        org: '',
        email: '',
        password: '',
        fullName: '',
        phone: ''
    });
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);

    const t = translations[lang];

    useEffect(() => {
        if (view === 'login' && formData.org) {
            fetchUsers(formData.org);
        } else {
            setUsers([]);
        }
    }, [formData.org, view]);

    const fetchUsers = async (orgId) => {
        setIsFetchingUsers(true);
        try {
            const { data, error } = await supabase
                .from('users') // Updated from profiles to users
                .select('email, full_name')
                .eq('organization', orgId)
                .order('full_name');

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsFetchingUsers(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password
            });
            if (error) throw error;
        } catch (error) {
            alert(`AUTH_ERROR: ${error.message}`);
        } finally {
            setIsLoading(false);
            setFormData(prev => ({ ...prev, password: '' }));
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        organization: formData.org,
                        phone: formData.phone
                    }
                }
            });

            if (authError) throw authError;

            // Insert into our 'users' table
            const { error: dbError } = await supabase.from('users').insert({
                id: data.user.id,
                email: formData.email,
                full_name: formData.fullName,
                organization: formData.org,
                phone: formData.phone,
                role: 'Viewer' // Default role
            });

            if (dbError) throw dbError;

            alert(lang === 'vi' ? 'Đăng ký thành công! Hãy kiểm tra email.' : 'Registration successful! Please check your email.');
            setView('login');
        } catch (error) {
            alert(`REG_ERROR: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgot = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(formData.email);
            if (error) throw error;
            alert(lang === 'vi' ? 'Yêu cầu đã được gửi!' : 'Reset request sent!');
            setView('login');
        } catch (error) {
            alert(`RESET_ERROR: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="lang-selector">
                <button className={`lang-btn ${lang === 'vi' ? 'active' : ''}`} onClick={() => setLang('vi')}>
                    <img src="https://flagcdn.com/w40/vn.png" alt="VN" />
                </button>
                <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>
                    <img src="https://flagcdn.com/w40/gb.png" alt="UK" />
                </button>
            </div>

            <div className="logo-bar">
                <div className="logo-item">
                    <img src="https://raw.githubusercontent.com/locvutrunglvt/Tancaonguyen/refs/heads/main/tancaonguyen_old/TCN%20logo.jpg" alt="TCN" />
                </div>
                <div className="logo-item">
                    <img src="https://logos-world.net/wp-content/uploads/2023/03/Tchibo-Logo.jpg" alt="Tchibo" />
                </div>
                <div className="logo-item">
                    <img src="https://nkgvietnam.com/wp-content/uploads/2023/05/NKG-Vietnam_Logo_left-1-01.svg" alt="NKG" />
                </div>
            </div>

            <div className="auth-card">
                <div className="logo-section" style={{ display: 'none' }}>
                    {/* Hidden default logo section in favor of top bar or specific branding */}
                </div>

                <header>
                    <h1>{t.title}</h1>
                </header>

                {view === 'login' && (
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label>{t.org}</label>
                            <select className="input-pro" required value={formData.org} onChange={(e) => setFormData({ ...formData, org: e.target.value })}>
                                <option value="">{t.selectOrg}</option>
                                {t.orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                            </select>
                        </div>

                        {formData.org && (
                            <div className="animate-in">
                                <div className="form-group">
                                    <label>{t.username}</label>
                                    <select className="input-pro" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}>
                                        <option value="">{isFetchingUsers ? 'LOADING...' : t.selectUser}</option>
                                        {users.map((u, i) => <option key={i} value={u.email}>{u.full_name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t.password}</label>
                                    <input className="input-pro" type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
                                </div>
                                <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? t.verifying : t.login}</button>
                            </div>
                        )}
                    </form>
                )}

                {view === 'register' && (
                    <form onSubmit={handleRegister}>
                        <div className="form-group">
                            <label>{t.fullName}</label>
                            <input className="input-pro" type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="Nguyen Van A" />
                        </div>
                        <div className="form-group">
                            <label>{t.email}</label>
                            <input className="input-pro" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                        </div>
                        <div className="form-group">
                            <label>{t.phone}</label>
                            <input className="input-pro" type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="090..." />
                        </div>
                        <div className="form-group">
                            <label>{t.org}</label>
                            <select className="input-pro" required value={formData.org} onChange={(e) => setFormData({ ...formData, org: e.target.value })}>
                                <option value="">{t.selectOrg}</option>
                                {t.orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>{t.password}</label>
                            <input className="input-pro" type="password" required minLength="6" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
                        </div>
                        <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? t.loading : t.register}</button>
                    </form>
                )}

                {view === 'forgot' && (
                    <form onSubmit={handleForgot}>
                        <div className="form-group">
                            <label>{t.email}</label>
                            <input className="input-pro" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                        </div>
                        <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? t.loading : t.reset}</button>
                    </form>
                )}

                <div className="footer-links">
                    {view === 'login' ? (
                        <>
                            <a href="#forgot" onClick={(e) => { e.preventDefault(); setView('forgot'); }}>{t.forgot}</a>
                            <a href="#signup" onClick={(e) => { e.preventDefault(); setView('register'); }}>{t.signup}</a>
                        </>
                    ) : (
                        <a href="#login" onClick={(e) => { e.preventDefault(); setView('login'); }}>{t.back}</a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
