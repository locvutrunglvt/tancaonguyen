import React, { useState } from 'react';
import './Login.css';

const translations = {
    vi: {
        title: 'Đăng Nhập',
        subtitle: 'Chào mừng bạn quay trở lại',
        org: 'Tổ chức',
        username: 'Tên đăng nhập',
        password: 'Mật khẩu',
        login: 'Đăng nhập',
        signup: 'Đăng ký tài khoản',
        forgot: 'Quên mật khẩu?',
        selectOrg: '-- Chọn tổ chức --',
        orgs: ['Tổ chức A', 'Tổ chức B', 'Tổ chức C', 'Tổ chức D']
    },
    en: {
        title: 'Login',
        subtitle: 'Welcome back to the platform',
        org: 'Organization',
        username: 'Username',
        password: 'Password',
        login: 'Log In',
        signup: 'Create account',
        forgot: 'Forgot password?',
        selectOrg: '-- Select Organization --',
        orgs: ['Organization A', 'Organization B', 'Organization C', 'Organization D']
    }
};

const Login = () => {
    const [lang, setLang] = useState('vi');
    const [formData, setFormData] = useState({
        org: '',
        username: '',
        password: ''
    });

    const t = translations[lang];

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Login attempt:', formData);
        alert(lang === 'vi' ? 'Chức năng đăng nhập đang được khởi tạo...' : 'Login function is being initialized...');
    };

    return (
        <div className="login-container">
            <div className="lang-selector">
                <button
                    className={`lang-btn ${lang === 'vi' ? 'active' : ''}`}
                    onClick={() => setLang('vi')}
                >
                    Tiếng Việt
                </button>
                <button
                    className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                    onClick={() => setLang('en')}
                >
                    English
                </button>
            </div>

            <header>
                <h1>{t.title}</h1>
                <p>{t.subtitle}</p>
            </header>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>{t.org}</label>
                    <select
                        required
                        value={formData.org}
                        onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                    >
                        <option value="">{t.selectOrg}</option>
                        {t.orgs.map((org, idx) => (
                            <option key={idx} value={org}>{org}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>{t.username}</label>
                    <input
                        type="text"
                        placeholder={t.username}
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label>{t.password}</label>
                    <input
                        type="password"
                        placeholder="••••••••"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                </div>

                <button type="submit" className="btn-login">
                    {t.login}
                </button>
            </form>

            <div className="footer-links">
                <a href="#forgot" onClick={(e) => e.preventDefault()}>{t.forgot}</a>
                <a href="#signup" onClick={(e) => e.preventDefault()}>{t.signup}</a>
            </div>
        </div>
    );
};

export default Login;
