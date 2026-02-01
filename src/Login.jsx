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
        signup: '[ NO_ACCOUNT?_REQUEST_ENTRY ]',
        forgot: '[ RECOVER_LOST_KEY ]',
        selectOrg: '-- [ SELECT_ORGANIZATION ] --',
        selectUser: '-- [ SELECT_AUTHORIZED_STAFF ] --',
        verifying: 'VERIFYING_AUTH_NODE...',
        loading: 'AUTHENTICATING...',
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
        signup: '[ NO_ACCOUNT?_REQUEST_ENTRY ]',
        forgot: '[ RECOVER_LOST_KEY ]',
        selectOrg: '-- [ SELECT_ORGANIZATION ] --',
        selectUser: '-- [ SELECT_AUTHORIZED_STAFF ] --',
        verifying: 'VERIFYING_AUTH_NODE...',
        loading: 'AUTHENTICATING...',
        orgs: [
            { id: 'tcn', name: 'TAN_CAO_NGUYEN' },
            { id: 'tchibo', name: 'TCHIBO_VIETNAM' },
            { id: 'nkg', name: 'NKG_GROUP' },
            { id: 'farmer', name: 'MODEL_FARMER' }
        ]
    }
};

const Login = () => {
    const [lang, setLang] = useState('vi');
    const [formData, setFormData] = useState({
        org: '',
        email: '',
        password: ''
    });
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);

    const t = translations[lang];

    useEffect(() => {
        if (formData.org) {
            fetchUsers(formData.org);
        } else {
            setUsers([]);
            setFormData(prev => ({ ...prev, email: '' }));
        }
    }, [formData.org]);

    const fetchUsers = async (orgId) => {
        setIsFetchingUsers(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('organization', orgId)
                .order('full_name');
            
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            alert('CORE_ERROR: Failed to fetch user nodes.');
        } finally {
            setIsFetchingUsers(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email) {
            alert('CORE_ERROR: Please select a user credential.');
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password
            });

            if (error) throw error;

            console.log('Login successful:', data);
            // Redirection logic should be handled in App.jsx based on auth state
        } catch (error) {
            alert(`AUTH_ERROR: ${error.message}`);
        } finally {
            setIsLoading(false);
            setFormData(prev => ({ ...prev, password: '' })); // Clear password
        }
    };

    return (
        <div className="login-container">
            <div className="lang-selector">
                <button
                    className={`lang-btn ${lang === 'vi' ? 'active' : ''}`}
                    onClick={() => setLang('vi')}
                    title="Tiếng Việt"
                >
                    <img src="https://flagcdn.com/w40/vn.png" alt="VN" />
                </button>
                <button
                    className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                    onClick={() => setLang('en')}
                    title="English"
                >
                    <img src="https://flagcdn.com/w40/gb.png" alt="UK" />
                </button>
            </div>

            <header>
                <span className="tech-label">{t.subtitle}</span>
                <h1>{t.title}</h1>
                <p>System Ver. 2.4.0 | Node: Active</p>
            </header>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>
                        <i className="fas fa-coffee"></i> {t.org}
                    </label>
                    <select
                        required
                        value={formData.org}
                        onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                    >
                        <option value="">{t.selectOrg}</option>
                        {t.orgs.map((org) => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                    </select>
                </div>

                {formData.org && (
                    <div className="animate-in fade-in duration-300">
                        <div className="form-group">
                            <label>
                                <i className="fas fa-user"></i> {t.username}
                            </label>
                            <select
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            >
                                <option value="">{isFetchingUsers ? 'LOADING_NODES...' : t.selectUser}</option>
                                {users.map((user, idx) => (
                                    <option key={idx} value={user.email}>
                                        {user.full_name.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>
                                <i className="fas fa-key"></i> {t.password}
                            </label>
                            <input
                                type="password"
                                placeholder="ENC_PROTOCOL_••••"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <button type="submit" className="btn-login" disabled={isLoading}>
                            {isLoading ? t.verifying : t.login}
                        </button>
                    </div>
                )}
            </form>

            <div className="footer-links">
                <a href="#forgot" onClick={(e) => e.preventDefault()}>{t.forgot}</a>
                <a href="#signup" onClick={(e) => e.preventDefault()}>{t.signup}</a>
            </div>
        </div>
    );
};

export default Login;
