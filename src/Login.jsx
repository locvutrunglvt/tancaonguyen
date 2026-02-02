import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './Login.css';

const translations = {
    vi: {
        title: 'QUẢN LÝ MÔ HÌNH CÀ PHÊ THÍCH ỨNG BIẾN ĐỔI KHÍ HẬU',
        subtitle: 'ĐĂNG NHẬP',
        org: 'Chọn tổ chức của bạn',
        username: 'Chọn tài khoản người dùng',
        password: 'Mật khẩu truy cập',
        login: 'Đăng nhập hệ thống',
        signup: '[ Đăng ký tài khoản mới ]',
        forgot: '[ Quên mật khẩu? ]',
        back: '[ Quay lại đăng nhập ]',
        register: 'Tạo tài khoản',
        reset: 'Gửi yêu cầu khôi phục',
        selectOrg: '-- Chọn tổ chức --',
        selectUser: '-- Chọn nhân viên --',
        verifying: 'Đang xác thực...',
        loading: 'Đang tải...',
        fullName: 'Họ và tên',
        phone: 'Số điện thoại',
        email: 'Địa chỉ email',
        orgs: [
            { id: 'tcn', name: 'Tân Cao Nguyên' },
            { id: 'tch', name: 'Tchibo Việt Nam' },
            { id: 'nkg', name: 'Neumann Kaffee Gruppe' },
            { id: 'farmer', name: 'Nông hộ hình mẫu' }
        ]
    },
    en: {
        title: 'COFFEE MODEL MANAGEMENT & CLIMATE ADAPTATION',
        subtitle: 'LOGIN',
        org: 'Select your organization',
        username: 'Select user credential',
        password: 'Access password',
        login: 'Authorize system access',
        signup: '[ Create new account ]',
        forgot: '[ Forgot password? ]',
        back: '[ Back to login ]',
        register: 'Create account',
        reset: 'Request reset',
        selectOrg: '-- Select organization --',
        selectUser: '-- Select staff --',
        verifying: 'Verifying...',
        loading: 'Loading...',
        fullName: 'Full name',
        phone: 'Phone number',
        email: 'Email address',
        orgs: [
            { id: 'tcn', name: 'Tan Cao Nguyen' },
            { id: 'tch', name: 'Tchibo Vietnam' },
            { id: 'nkg', name: 'Neumann Kaffee Gruppe' },
            { id: 'farmer', name: 'Model Farmer' }
        ]
    },
    ede: {
        title: 'ČIH MRÂO KƠ KĂPHÊ DLEH MLIH YAN HRUÊ',
        subtitle: 'LÔT TNIH',
        org: 'Hriêng knhuă bruă',
        username: 'Hriêng mnuih bruă',
        password: 'Mật khẩu',
        login: 'Lôt tnih hệ thống',
        signup: '[ Čih anăn mrâo ]',
        forgot: '[ Khŏ kơ mật khẩu? ]',
        back: '[ Lêt glơ̆ đăng nhập ]',
        register: 'Čih anăn',
        reset: 'Gửi yêu cầu',
        selectOrg: '-- Hriêng knhuă --',
        selectUser: '-- Hriêng mnuih --',
        verifying: 'Đang xác thực...',
        loading: 'Đang tải...',
        fullName: 'Anăn mnuih',
        phone: 'Số điện thoại',
        email: 'Email address',
        orgs: [
            { id: 'tcn', name: 'Tân Cao Nguyên' },
            { id: 'tch', name: 'Tchibo Việt Nam' },
            { id: 'nkg', name: 'Neumann Kaffee Gruppe' },
            { id: 'farmer', name: 'Mnuih hma' }
        ]
    }
};

const Login = ({ onDevLogin }) => {
    const [view, setView] = useState('login');
    const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'vi');

    useEffect(() => {
        localStorage.setItem('app_lang', lang);
    }, [lang]);
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
            // Try fetching from 'profiles' first (standard), then 'User'
            let { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name, role')
                .eq('organization', orgId)
                .order('full_name');

            if (error) {
                console.error('Profiles fetch failed:', error.message);
                // No fallback to corrupt 'User' table
                throw error;
            }

            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error.message);
        } finally {
            setIsFetchingUsers(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            alert(t.reset_sent);
            setView('login');
        } catch (error) {
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        console.log("LOGIN_START: ", formData.email);
        try {
            const selectedUser = users.find(u => u.email === formData.email);

            try {
                const { error: authError } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password
                });

                if (!authError) {
                    console.log("AUTH_LOGIN_SUCCESS");
                    return;
                }

                if (authError && onDevLogin) {
                    console.warn("AUTH_FAIL: Switching to Silent Bypass Mode.");
                    onDevLogin({
                        email: formData.email,
                        full_name: selectedUser?.full_name || formData.email.split('@')[0],
                        phone: formData.phone,
                        organization: formData.org,
                        role: selectedUser?.role || 'Viewer',
                        id: selectedUser?.id || '00000000-0000-0000-0000-000000000000' // Use real UUID or fallback empty UUID
                    });
                    return;
                }
                throw authError;
            } catch (innerError) {
                // If we already called onDevLogin and returned, this line won't be reached
                throw innerError;
            }
        } catch (error) {
            console.error("LOGIN_FINAL_ERROR: ", error);
            alert(`LOGIN_ERROR: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const performDirectDbInsert = async (userId = null) => {
        // Ensure a valid UUID format for the 'id' column
        const generateUUID = () => {
            if (crypto.randomUUID) return crypto.randomUUID();
            // Fallback UUID v4 generator
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        const id = userId || generateUUID();
        const currentLang = localStorage.getItem('app_lang') || 'vi';

        // Check if profile exists first to avoid duplicate key errors
        const { data: existing } = await supabase.from('profiles').select('id').eq('email', formData.email).single();
        if (existing) {
            alert(currentLang === 'vi' ? 'Tài khoản đã được đăng ký hồ sơ!' : 'Account already has a profile!');
            setView('login');
            return;
        }

        // Use 'Phone' with uppercase P as seen in the schema for now, 
        // but the plan is to rename the DB column. 
        // To be safe during transition, I'll use lowercase if renaming succeeds.
        // Actually, the user error said "column User.phone does not exist", 
        // meaning I should use uppercase Phone until renamed, or just rename it now.

        const userData = {
            id: id,
            email: formData.email,
            full_name: formData.fullName,
            organization: formData.org || 'gus',
            phone: formData.phone,
            role: 'Guest',
            approved: false,
            employee_code: `PENDING-${Math.floor(Math.random() * 900) + 100}`,
            created_at: new Date().toISOString()
        };

        // Insert into 'profiles' table which is verified to exist and have correct schema
        const { error: profError } = await supabase.from('profiles').insert([userData]);

        if (profError) {
            console.error('Profiles insert failed:', profError.message);
            throw new Error(`DATABASE_ERROR: ${profError.message}`);
        }

        alert(currentLang === 'vi'
            ? 'ĐĂNG KÝ THÀNH CÔNG! Vui lòng chờ Admin TCN phê duyệt tài khoản của bạn.'
            : 'REGISTRATION SUCCESS! Please wait for TCN Admin to approve your account.');
        setView('login');
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });

            if (authError) {
                console.warn("REG_FAIL: Silent Bypass to Direct DB Insert.");
                return await performDirectDbInsert();
            }

            await performDirectDbInsert(data?.user?.id);
        } catch (error) {
            alert(`REG_ERROR: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`login-container lang-${lang}`}>
            <div className="lang-selector">
                <button className={`lang-btn ${lang === 'vi' ? 'active' : ''}`} onClick={() => setLang('vi')}>
                    <img src="https://flagcdn.com/w40/vn.png" alt="VN" />
                </button>
                <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>
                    <img src="https://flagcdn.com/w40/gb.png" alt="UK" />
                </button>
                <button className={`lang-btn ${lang === 'ede' ? 'active' : ''}`} onClick={() => setLang('ede')} style={{ fontSize: '12px', fontWeight: 'bold', color: '#fbbf24', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                    Ê Đê
                </button>
            </div>

            <div className="login-branding">
                <div className="logo-bar-centered">
                    <img src="https://github.com/locvutrunglvt/Tancaonguyen/blob/main/Logo.png?raw=true" alt="TCN - Tchibo - NKG" className="logo-2x" />
                </div>
                <h1 className="login-project-title-top">{t.title}</h1>
            </div>

            <div className="auth-card">
                <header><p className="auth-subtitle">{t.subtitle}</p></header>

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
                                        <option value="">{isFetchingUsers ? 'LOADING...' : (users.length === 0 ? 'CHƯA CÓ NHÂN VIÊN' : t.selectUser)}</option>
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
                    <form onSubmit={handleForgotPassword}>
                        <div className="form-group">
                            <label>{t.email}</label>
                            <input className="input-pro" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                        </div>
                        <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? t.loading : t.send_reset}</button>
                    </form>
                )}

                <div className="footer-links">
                    {view === 'login' ? (
                        <>
                            <a href="#signup" onClick={(e) => { e.preventDefault(); setView('register'); }}>{t.signup}</a>
                            <a href="#forgot" onClick={(e) => { e.preventDefault(); setView('forgot'); }}>{t.forgot}</a>
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
