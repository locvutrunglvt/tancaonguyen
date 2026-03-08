import React, { useState, useEffect } from 'react';
import { translations } from './translations';
import { themes, applyTheme, getStoredTheme } from './themes';
import BackupRestore from './BackupRestore';
import {
    SUPPORTED_CURRENCIES,
    getDisplayCurrency, setDisplayCurrency,
    getCachedRates, isCacheStale, fetchExchangeRates,
    getRatesTimestamp,
} from './currencyUtils';

const Settings = ({
    onBack, appLang = 'vi', currentUser,
    // User management props (for Admin tab)
    users, fetchUsersList, userForm, setUserForm,
    showUserModal, setShowUserModal,
    isEditing, setIsEditing,
    handleSaveUser, handleDeleteUser, handleResetPassword,
    loading,
    // UserManagementView component rendered by Dashboard
    renderUserManagement,
}) => {
    const t = translations[appLang] || translations.vi;
    const isAdmin = currentUser?.role === 'Admin';
    const [activeTab, setActiveTab] = useState('themes');

    // Theme state
    const [activeTheme, setActiveTheme] = useState(getStoredTheme());

    // Currency state
    const [dispCurrency, setDispCurrency] = useState(getDisplayCurrency());
    const [rates, setRates] = useState(getCachedRates());
    const [ratesFetching, setRatesFetching] = useState(false);
    const [ratesError, setRatesError] = useState('');

    // Admin sub-tab
    const [adminTab, setAdminTab] = useState('users');

    useEffect(() => {
        if (activeTab === 'currency' && (!rates || isCacheStale())) {
            handleRefreshRates();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'admin' && isAdmin && fetchUsersList) {
            fetchUsersList();
        }
    }, [activeTab]);

    const handleThemeApply = (themeId) => {
        applyTheme(themeId);
        setActiveTheme(themeId);
    };

    const handleCurrencyChange = (code) => {
        setDisplayCurrency(code);
        setDispCurrency(code);
    };

    const handleRefreshRates = async () => {
        setRatesFetching(true);
        setRatesError('');
        try {
            const fresh = await fetchExchangeRates();
            setRates(fresh);
        } catch {
            setRatesError(t.currency_error || 'Could not fetch rates');
        } finally {
            setRatesFetching(false);
        }
    };

    const tabs = [
        { id: 'themes', label: t.settings_themes || 'Giao diện', icon: 'fas fa-palette' },
        { id: 'currency', label: t.settings_currency || 'Tiền tệ', icon: 'fas fa-coins' },
        ...(isAdmin ? [{ id: 'admin', label: t.settings_admin || 'Quản trị', icon: 'fas fa-users-cog' }] : []),
    ];

    const ratesTs = getRatesTimestamp();
    const ratesTime = ratesTs ? new Date(ratesTs).toLocaleString(appLang === 'en' ? 'en-US' : 'vi-VN') : null;

    return (
        <div className="view-container" style={{ animation: 'fadeInUp 0.5s ease' }}>
            {/* Back button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button onClick={onBack} className="btn-back">
                    <i className="fas fa-arrow-left"></i> {t.back || 'Quay lại'}
                </button>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--coffee-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-cog" style={{ color: 'var(--coffee-primary)' }}></i>
                    {t.settings || 'Cài đặt'}
                </h2>
            </div>

            {/* Tab bar */}
            <div style={{
                display: 'flex', gap: '4px', marginBottom: '20px',
                background: 'var(--cream, #f5f5f5)', borderRadius: '12px', padding: '4px',
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 1, padding: '10px 16px', borderRadius: '10px',
                            border: 'none', cursor: 'pointer',
                            fontSize: '13px', fontWeight: activeTab === tab.id ? 700 : 500,
                            background: activeTab === tab.id ? 'var(--white, #fff)' : 'transparent',
                            color: activeTab === tab.id ? 'var(--coffee-dark)' : 'var(--gray-700)',
                            boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.2s ease',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        }}
                    >
                        <i className={tab.icon} style={{ fontSize: '14px' }}></i>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* === THEMES TAB === */}
            {activeTab === 'themes' && (
                <div>
                    <p style={{ fontSize: '13px', color: 'var(--gray-700)', opacity: 0.7, marginBottom: '16px' }}>
                        {appLang === 'vi' ? 'Chọn giao diện phù hợp với bạn' : appLang === 'en' ? 'Choose your preferred theme' : 'Hriêng asei đrưh kơ jia'}
                    </p>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: '14px',
                    }}>
                        {Object.values(themes).map((theme) => {
                            const isActive = activeTheme === theme.id;
                            return (
                                <div
                                    key={theme.id}
                                    onClick={() => handleThemeApply(theme.id)}
                                    style={{
                                        background: 'var(--white, #fff)', borderRadius: '14px',
                                        border: isActive ? `2.5px solid ${theme.preview[0]}` : '2px solid var(--gray-200)',
                                        padding: '16px', cursor: 'pointer',
                                        transition: 'all 0.25s ease',
                                        boxShadow: isActive ? `0 4px 20px ${theme.preview[0]}30` : 'var(--shadow-sm)',
                                        position: 'relative',
                                    }}
                                >
                                    {isActive && (
                                        <div style={{
                                            position: 'absolute', top: '10px', right: '10px',
                                            background: theme.preview[0], color: '#fff',
                                            fontSize: '10px', fontWeight: 700, padding: '3px 10px',
                                            borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px',
                                        }}>
                                            <i className="fas fa-check-circle"></i>
                                            {appLang === 'vi' ? 'Đang dùng' : appLang === 'en' ? 'Active' : 'Hruê anei'}
                                        </div>
                                    )}
                                    <div style={{
                                        display: 'flex', borderRadius: '8px', overflow: 'hidden',
                                        height: '40px', marginBottom: '12px',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                    }}>
                                        {theme.preview.map((color, i) => (
                                            <div key={i} style={{ flex: 1, background: color }} />
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '8px',
                                            background: `linear-gradient(135deg, ${theme.preview[0]}, ${theme.preview[1]})`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontSize: '14px', flexShrink: 0,
                                        }}>
                                            <i className={theme.icon}></i>
                                        </div>
                                        <div style={{
                                            fontWeight: 700, fontSize: '13px',
                                            color: isActive ? theme.preview[0] : 'var(--gray-900)',
                                        }}>
                                            {theme.name[appLang] || theme.name.vi}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* === CURRENCY TAB === */}
            {activeTab === 'currency' && (
                <div style={{ maxWidth: '600px' }}>
                    {/* Input Currency */}
                    <div style={{
                        background: 'var(--white, #fff)', borderRadius: '14px', padding: '20px',
                        boxShadow: 'var(--shadow-sm)', marginBottom: '16px',
                        border: '1px solid var(--gray-200)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '4px' }}>
                                    {t.currency_input || 'Tiền tệ nhập'}
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--coffee-dark)' }}>
                                    VND — Đồng Việt Nam
                                </div>
                            </div>
                            <span style={{
                                padding: '4px 12px', borderRadius: '20px',
                                background: 'var(--cream)', color: 'var(--gray-700)',
                                fontSize: '11px', fontWeight: 700,
                            }}>
                                {t.currency_input_fixed || 'Cố định'}
                            </span>
                        </div>
                    </div>

                    {/* Display Currency */}
                    <div style={{
                        background: 'var(--white, #fff)', borderRadius: '14px', padding: '20px',
                        boxShadow: 'var(--shadow-sm)', marginBottom: '16px',
                        border: '1px solid var(--gray-200)',
                    }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '10px' }}>
                            {t.currency_display || 'Tiền tệ hiển thị'}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {SUPPORTED_CURRENCIES.map(cur => (
                                <button
                                    key={cur.code}
                                    onClick={() => handleCurrencyChange(cur.code)}
                                    style={{
                                        padding: '10px 18px', borderRadius: '10px',
                                        border: dispCurrency === cur.code ? '2px solid var(--coffee-primary)' : '1.5px solid var(--gray-200)',
                                        background: dispCurrency === cur.code ? 'var(--cream)' : 'var(--white, #fff)',
                                        cursor: 'pointer', transition: 'all 0.2s ease',
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                    }}
                                >
                                    <span style={{ fontSize: '18px', fontWeight: 800 }}>{cur.symbol}</span>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--coffee-dark)' }}>{cur.code}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--gray-700)' }}>{cur.name[appLang] || cur.name.vi}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Exchange Rate Info */}
                    <div style={{
                        background: 'var(--white, #fff)', borderRadius: '14px', padding: '20px',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--gray-200)',
                    }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '12px' }}>
                            {t.currency_rate || 'Tỷ giá'}
                        </div>

                        {ratesFetching && (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-700)' }}>
                                <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                                {t.currency_loading || 'Đang lấy tỷ giá...'}
                            </div>
                        )}

                        {ratesError && (
                            <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '8px', color: '#b91c1c', fontSize: '12px', marginBottom: '12px' }}>
                                <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }}></i>
                                {ratesError}
                            </div>
                        )}

                        {rates && !ratesFetching && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {SUPPORTED_CURRENCIES.filter(c => c.code !== 'VND').map(cur => {
                                    const rate = rates[cur.code];
                                    if (!rate) return null;
                                    const vndPer1 = Math.round(1 / rate);
                                    return (
                                        <div key={cur.code} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '10px 14px', background: 'var(--cream-light, #faf6f3)',
                                            borderRadius: '8px',
                                        }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--coffee-dark)' }}>
                                                1 {cur.code}
                                            </span>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--coffee-primary)' }}>
                                                = {vndPer1.toLocaleString('vi-VN')} ₫
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                            {ratesTime && (
                                <span style={{ fontSize: '11px', color: 'var(--gray-700)', opacity: 0.6 }}>
                                    {t.currency_updated || 'Cập nhật lúc'}: {ratesTime}
                                </span>
                            )}
                            <button
                                onClick={handleRefreshRates}
                                disabled={ratesFetching}
                                className="btn-primary"
                                style={{ fontSize: '11px', padding: '6px 14px' }}
                            >
                                <i className={`fas ${ratesFetching ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} style={{ marginRight: '4px' }}></i>
                                {t.currency_refresh || 'Làm mới'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === ADMIN TAB === */}
            {activeTab === 'admin' && isAdmin && (
                <div>
                    {/* Admin sub-tabs */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <button
                            onClick={() => setAdminTab('users')}
                            style={{
                                padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                fontSize: '12px', fontWeight: adminTab === 'users' ? 700 : 500,
                                background: adminTab === 'users' ? 'var(--coffee-primary)' : 'var(--cream)',
                                color: adminTab === 'users' ? '#fff' : 'var(--coffee-dark)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <i className="fas fa-users" style={{ marginRight: '6px' }}></i>
                            {t.settings_users || 'Người dùng'}
                        </button>
                        <button
                            onClick={() => setAdminTab('backup')}
                            style={{
                                padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                fontSize: '12px', fontWeight: adminTab === 'backup' ? 700 : 500,
                                background: adminTab === 'backup' ? 'var(--coffee-primary)' : 'var(--cream)',
                                color: adminTab === 'backup' ? '#fff' : 'var(--coffee-dark)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <i className="fas fa-database" style={{ marginRight: '6px' }}></i>
                            {t.settings_backup || 'Sao lưu'}
                        </button>
                    </div>

                    {adminTab === 'users' && renderUserManagement && renderUserManagement()}

                    {adminTab === 'backup' && (
                        <BackupRestore onBack={() => setAdminTab('users')} appLang={appLang} currentUser={currentUser} />
                    )}
                </div>
            )}
        </div>
    );
};

export default Settings;
