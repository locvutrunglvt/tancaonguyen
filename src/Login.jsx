import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './Login.css';

const translations = {
    vi: {
        title: 'QUẢN LÝ MÔ HÌNH CÀ PHÊ THÍCH ỨNG BIẾN ĐỔI KHÍ HẬU',
        subtitle: '[ Xác thực hệ thống ]',
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
            { id: 'tchibo', name: 'Tchibo Việt Nam' },
            { id: 'nkg', name: 'Neumann Kaffee Gruppe' },
            { id: 'farmer', name: 'Nông hộ hình mẫu' }
        ]
    },
    en: {
        title: 'COFFEE MODEL MANAGEMENT & CLIMATE ADAPTATION',
        subtitle: '[ System authorization ]',
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
            { id: 'tchibo', name: 'Tchibo Vietnam' },
            { id: 'nkg', name: 'Neumann Kaffee Gruppe' },
            { id: 'farmer', name: 'Model Farmer' }
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
                .select('email, full_name, role')
                .eq('organization', orgId)
                .order('full_name');

            if (error) {
                console.warn('Profiles fetch failed, trying User table...');
                const { data: userData, error: userError } = await supabase
                    .from('User')
                    .select('email, full_name, role')
                    .eq('organization', orgId)
                    .order('full_name');

                if (userError) throw userError;
                data = userData;
            }

            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error.message);
        } finally {
            setIsFetchingUsers(false);
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

                console.warn("AUTH_LOGIN_FAIL, checking bypass: ", authError.message);

                // If auth fails (e.g., user exists in DB but not in Auth yet)
                if (authError && onDevLogin) {
                    const bypass = window.confirm(
                        lang === 'vi'
                            ? `LỖI XÁC THỰC: ${authError.message}\n\nTài khoản này có thể chưa được kích hoạt email hoặc bạn đã dùng chế độ "Bypass" khi đăng ký.\n\nBẠN CÓ MUỐN ĐĂNG NHẬP CHẾ ĐỘ DEVELOPER ĐỂ TIẾP TỤC KHÔNG?`
                            : `AUTH ERROR: ${authError.message}\n\nThis account might be unverified or created via Bypass.\n\nDO YOU WANT TO LOGIN IN DEVELOPER MODE TO PROCEED?`
                    );
                    if (bypass) {
                        console.log("BYPASS_ACTIVATED for: ", formData.email);
                        onDevLogin({
                            email: formData.email,
                            full_name: selectedUser?.full_name || formData.email.split('@')[0],
                            organization: formData.org,
                            role: selectedUser?.role || 'Viewer',
                            id: formData.email // Use email as temporary ID
                        });
                        return;
                    }
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

        const userData = {
            id: id,
            email: formData.email,
            full_name: formData.fullName,
            organization: formData.org,
            phone: formData.phone,
            role: 'Employee',
            employee_code: `DEV-${Math.floor(Math.random() * 1000)}`,
            created_at: new Date().toISOString()
        };

        // Try 'profiles' table first (preferred)
        const { error: profError } = await supabase.from('profiles').insert([userData]);

        if (profError) {
            console.error('Profiles insert failed:', profError.message);
            // Fallback to 'User' table if it exists
            const { error: userError } = await supabase.from('User').insert([userData]);

            if (userError) {
                throw new Error(`DATABASE_ERROR: ${profError.message} (and ${userError.message})`);
            }
        }

        alert(currentLang === 'vi' ? 'ĐĂNG KÝ THÀNH CÔNG!' : 'REGISTRATION SUCCESS!');
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
                if (authError.message.includes('rate limit')) {
                    const useDev = window.confirm(
                        lang === 'vi'
                            ? `LỖI GIỚI HẠN: ${authError.message}\n\nBẠN CÓ MUỐN BỎ QUA XÁC THỰC EMAIL VÀ TẠO TÀI KHOẢN TRỰC TIẾP KHÔNG?`
                            : `RATE LIMIT: ${authError.message}\n\nBYPASS EMAIL VERIFICATION AND CREATE PROFILE DIRECTLY?`
                    );
                    if (useDev) {
                        return await performDirectDbInsert();
                    }
                }
                throw authError;
            }

            await performDirectDbInsert(data?.user?.id);
        } catch (error) {
            alert(`REG_ERROR: ${error.message}`);
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
                <button className={`lang-btn ${lang === 'ede' ? 'active' : ''}`} onClick={() => setLang('ede')} style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    Ê Đê
                </button>
            </div>

            <div className="logo-bar">
                <div className="logo-item"><img src="https://raw.githubusercontent.com/locvutrunglvt/Tancaonguyen/refs/heads/main/tancaonguyen_old/TCN%20logo.jpg" alt="TCN" /></div>
                <div className="logo-item"><img src="https://logos-world.net/wp-content/uploads/2023/03/Tchibo-Logo.jpg" alt="Tchibo" /></div>
                <div className="logo-item"><img src="https://nkgvietnam.com/wp-content/uploads/2023/05/NKG-Vietnam_Logo_left-1-01.svg" alt="NKG" /></div>
            </div>

            <div className="auth-card">
                <header><p className="auth-title">{t.title}</p></header>

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

                <div className="footer-links">
                    {view === 'login' ? (
                        <a href="#signup" onClick={(e) => { e.preventDefault(); setView('register'); }}>{t.signup}</a>
                    ) : (
                        <a href="#login" onClick={(e) => { e.preventDefault(); setView('login'); }}>{t.back}</a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
