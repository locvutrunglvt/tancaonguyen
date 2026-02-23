import React, { useState, useEffect } from 'react';
import pb from './pbClient';
import { translations } from './translations';
import './Login.css';

const Login = () => {
    const [view, setView] = useState('login');
    const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'vi');

    useEffect(() => {
        localStorage.setItem('app_lang', lang);
    }, [lang]);

    const [formData, setFormData] = useState({
        org: 'tcn',
        email: 'locvutrung@gmail.com',
        password: '',
        fullName: '',
        phone: ''
    });
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);

    const t = translations[lang] || translations.vi;

    useEffect(() => {
        if (view === 'login' && formData.org) {
            fetchUsers(formData.org);
        } else {
            setUsers([]);
        }
    }, [formData.org, view]);

    const [manualEntry, setManualEntry] = useState(false);

    const fetchUsers = async (orgId) => {
        setIsFetchingUsers(true);
        try {
            const data = await pb.collection('users').getFullList({
                filter: `organization='${orgId}'`,
                sort: 'full_name',
            });

            let finalUsers = data || [];
            if (orgId === 'tcn') {
                const adminEmail = 'locvutrung@gmail.com';
                const hasAdmin = finalUsers.some(u => u.email === adminEmail);
                if (!hasAdmin) {
                    finalUsers = [
                        {
                            id: 'admin_fallback',
                            email: adminEmail,
                            full_name: 'Đỗ Thành Duy',
                            role: 'Admin'
                        },
                        ...finalUsers
                    ];
                }
            }

            setUsers(finalUsers);
        } catch (error) {
            console.error('Error fetching users:', error.message);
            if (orgId === 'tcn') {
                setUsers([{
                    id: 'admin_fallback',
                    email: 'locvutrung@gmail.com',
                    full_name: 'Đỗ Thành Duy (Fallback)',
                    role: 'Admin'
                }]);
            } else {
                setUsers([]);
            }
        } finally {
            setIsFetchingUsers(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await pb.collection('users').requestPasswordReset(formData.email);
            alert(t.reset_sent || 'Yêu cầu đã được gửi! Vui lòng kiểm tra email.');
            setView('login');
        } catch (error) {
            // SMTP not configured or other error
            alert(lang === 'vi'
                ? 'Chức năng đặt lại mật khẩu qua email chưa sẵn sàng. Vui lòng liên hệ Quản trị viên để được hỗ trợ.'
                : lang === 'en'
                ? 'Password reset via email is not available. Please contact the Administrator for assistance.'
                : 'Klei mblang password qua email ka dưm jing. Bi mơ khua mdrông.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await pb.collection('users').authWithPassword(
                formData.email,
                formData.password
            );
        } catch (error) {
            alert(lang === 'vi'
                ? 'Sai email hoặc mật khẩu. Vui lòng thử lại.'
                : lang === 'en'
                ? 'Wrong email or password. Please try again.'
                : 'Soh email mâo password. Lŏ bi lĕ.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await pb.collection('users').create({
                email: formData.email,
                password: formData.password,
                passwordConfirm: formData.password,
                full_name: formData.fullName,
                organization: formData.org || 'gus',
                phone: formData.phone,
                role: 'Guest',
                employee_code: `${(formData.org || 'GUS').toUpperCase()}-${Math.floor(Math.random() * 9000) + 1000}`,
            });

            alert(t.reg_success || 'REGISTRATION SUCCESS!');
            setView('login');
        } catch (error) {
            alert(`REG_ERROR: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const orgs = [
        { id: 'tcn', name: t.org_tcn || 'Tân Cao Nguyên' },
        { id: 'tch', name: t.org_tch || 'Tchibo Việt Nam' },
        { id: 'nkg', name: t.org_nkg || 'Neumann Kaffee Gruppe' },
        { id: 'far', name: t.org_far || 'Nông hộ hình mẫu' }
    ];

    return (
        <div className={`login-container lang-${lang}`}>
            <div className="login-branding">
                <div className="logo-bar-centered">
                    <img src="https://github.com/locvutrunglvt/Tancaonguyen/blob/main/Logo.png?raw=true" alt="TCN - Tchibo - NKG" className="logo-2x" />
                </div>
                <h1 className="login-project-title-top">
                    <span className="title-line-1">{t.app_title_1}</span>
                    <span className="title-line-2">{t.app_title_2}</span>
                </h1>
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
            </div>

            <div className="auth-card">
                <header><p className="auth-subtitle">{t.subtitle}</p></header>

                {view === 'login' && (
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label>{t.login_org}</label>
                            <select className="input-pro" required value={formData.org} onChange={(e) => setFormData({ ...formData, org: e.target.value })}>
                                <option value="">{t.select_org}</option>
                                {orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                            </select>
                        </div>

                        {formData.org && (
                            <div className="animate-in">
                                <div className="form-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label>{t.login_username}</label>
                                        <span
                                            onClick={() => setManualEntry(!manualEntry)}
                                            style={{ fontSize: '11px', color: '#fbbf24', cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            {manualEntry ? (lang === 'vi' ? 'Chọn từ danh sách' : lang === 'en' ? 'Select from list' : 'Hriêng klei anăn') : (lang === 'vi' ? 'Nhập email thủ công' : lang === 'en' ? 'Type email manually' : 'Čih email')}
                                        </span>
                                    </div>
                                    {manualEntry ? (
                                        <input
                                            className="input-pro"
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="email@example.com"
                                        />
                                    ) : (
                                        <select className="input-pro" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}>
                                            <option value="">{isFetchingUsers ? 'LOADING...' : (users.length === 0 ? (lang === 'vi' ? 'CHƯA CÓ NHÂN VIÊN' : 'NO USERS') : t.select_user)}</option>
                                            {users.map((u, i) => <option key={i} value={u.email}>{u.full_name}</option>)}
                                        </select>
                                    )}
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
                            <label>{t.user_name}</label>
                            <input className="input-pro" type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="Nguyen Van A" />
                        </div>
                        <div className="form-group">
                            <label>{t.user_email}</label>
                            <input className="input-pro" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                        </div>
                        <div className="form-group">
                            <label>{t.user_phone}</label>
                            <input className="input-pro" type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="090..." />
                        </div>
                        <div className="form-group">
                            <label>{t.login_org}</label>
                            <select className="input-pro" required value={formData.org} onChange={(e) => setFormData({ ...formData, org: e.target.value })}>
                                <option value="">{t.select_org}</option>
                                {orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>{t.password}</label>
                            <input className="input-pro" type="password" required minLength="8" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
                        </div>
                        <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? t.loading : t.add}</button>
                    </form>
                )}

                {view === 'forgot' && (
                    <form onSubmit={handleForgotPassword}>
                        <div className="form-group">
                            <label>{t.user_email}</label>
                            <input className="input-pro" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                        </div>
                        <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? t.loading : (lang === 'vi' ? 'Gửi yêu cầu' : 'Send request')}</button>
                    </form>
                )}

                <div className="footer-links">
                    {view === 'login' ? (
                        <>
                            <a href="#signup" onClick={(e) => { e.preventDefault(); setView('register'); }}>{t.login_signup}</a>
                            <a href="#forgot" onClick={(e) => { e.preventDefault(); setView('forgot'); }}>{t.login_forgot}</a>
                        </>
                    ) : (
                        <a href="#login" onClick={(e) => { e.preventDefault(); setView('login'); }}>{t.login_back}</a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
