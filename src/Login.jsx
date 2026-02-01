import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './Login.css';

const translations = {
    vi: {
        title: 'Quản lý nông hộ & Thích ứng biến đổi khí hậu',
        subtitle: '[ SYSTEM AUTHORIZATION ]',
        org: '01_ORGANIZATION_IDENTITY',
        username: '02_USER_CREDENTIAL',
        password: '03_ACCESS_KEY',
        login: 'XÁC THỰC TRUY CẬP',
        signup: '[ ĐĂNG KÝ TÀI KHOẢN MỚI ]',
        forgot: '[ QUÊN MẬT KHẨU? ]',
        back: '[ QUAY LẠI ĐĂNG NHẬP ]',
        register: 'TẠO TÀI KHOẢN',
        reset: 'GỬI YÊU CẦU KHÔI PHỤC',
        selectOrg: '-- [ CHỌN TỔ CHỨC ] --',
        selectUser: '-- [ CHỌN NHÂN VIÊN ] --',
        verifying: 'ĐANG XÁC THỰC...',
        loading: 'ĐANG TẢI...',
        fullName: 'HỌ VÀ TÊN',
        phone: 'SỐ ĐIỆN THOẠI',
        email: 'ĐỊA CHỈ EMAIL',
        orgs: [
            { id: 'tcn', name: 'TAN_CAO_NGUYEN' },
            { id: 'tchibo', name: 'TCHIBO_VIETNAM' },
            { id: 'nkg', name: 'NKG_GROUP' },
            { id: 'farmer', name: 'MODEL_FARMER' }
        ]
    },
    en: {
        title: 'Farming Management & Climate Adaptation',
        subtitle: '[ SYSTEM AUTHORIZATION ]',
        org: '01_ORGANIZATION_IDENTITY',
        username: '02_USER_CREDENTIAL',
        password: '03_ACCESS_KEY',
        login: 'AUTHORIZE_SYSTEM_ACCESS',
        signup: '[ CREATE NEW ACCOUNT ]',
        forgot: '[ FORGOT PASSWORD? ]',
        back: '[ BACK TO LOGIN ]',
        register: 'CREATE ACCOUNT',
        reset: 'REQUEST RESET',
        selectOrg: '-- [ SELECT ORGANIZATION ] --',
        selectUser: '-- [ SELECT STAFF ] --',
        verifying: 'VERIFYING...',
        loading: 'LOADING...',
        fullName: 'FULL NAME',
        phone: 'PHONE NUMBER',
        email: 'EMAIL ADDRESS',
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

            <header>
                <span className="tech-label">{t.subtitle}</span>
                <h1>{t.title}</h1>
                <p>System Ver. 2.4.0 | View: {view.toUpperCase()}</p>
            </header>

            {view === 'login' && (
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label><i className="fas fa-coffee"></i> {t.org}</label>
                        <select required value={formData.org} onChange={(e) => setFormData({ ...formData, org: e.target.value })}>
                            <option value="">{t.selectOrg}</option>
                            {t.orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                        </select>
                    </div>

                    {formData.org && (
                        <div className="animate-in fade-in duration-300">
                            <div className="form-group">
                                <label><i className="fas fa-user"></i> {t.username}</label>
                                <select required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}>
                                    <option value="">{isFetchingUsers ? 'LOADING...' : t.selectUser}</option>
                                    {users.map((u, i) => <option key={i} value={u.email}>{u.full_name.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label><i className="fas fa-key"></i> {t.password}</label>
                                <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
                            </div>
                            <button type="submit" className="btn-login" disabled={isLoading}>{isLoading ? t.verifying : t.login}</button>
                        </div>
                    )}
                </form>
            )}

            {view === 'register' && (
                <form onSubmit={handleRegister}>
                    <div className="form-group">
                        <label>{t.fullName}</label>
                        <input type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="NGUYEN VAN A" />
                    </div>
                    <div className="form-group">
                        <label>{t.email}</label>
                        <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                    </div>
                    <div className="form-group">
                        <label>{t.phone}</label>
                        <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="090..." />
                    </div>
                    <div className="form-group">
                        <label>{t.org}</label>
                        <select required value={formData.org} onChange={(e) => setFormData({ ...formData, org: e.target.value })}>
                            <option value="">{t.selectOrg}</option>
                            {t.orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>{t.password}</label>
                        <input type="password" required minLength="6" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
                    </div>
                    <button type="submit" className="btn-login" disabled={isLoading}>{isLoading ? t.loading : t.register}</button>
                </form>
            )}

            {view === 'forgot' && (
                <form onSubmit={handleForgot}>
                    <div className="form-group">
                        <label>{t.email}</label>
                        <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                    </div>
                    <button type="submit" className="btn-login" disabled={isLoading}>{isLoading ? t.loading : t.reset}</button>
                </form>
            )}

            <div className="footer-links">
                {view === 'login' ? (
                    <>
                        <a href="#forgot" onClick={() => setView('forgot')}>{t.forgot}</a>
                        <a href="#signup" onClick={() => setView('register')}>{t.signup}</a>
                    </>
                ) : (
                    <a href="#login" onClick={() => setView('login')}>{t.back}</a>
                )}
            </div>
        </div>
    );
};

export default Login;
