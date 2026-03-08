import React, { useState } from 'react';
import { themes, applyTheme, getStoredTheme } from './themes';

const ThemeSettings = ({ appLang = 'vi', onBack }) => {
    const [activeTheme, setActiveTheme] = useState(getStoredTheme());

    const labels = {
        vi: { title: 'Giao diện', subtitle: 'Chọn giao diện phù hợp với bạn', current: 'Đang sử dụng', apply: 'Áp dụng' },
        en: { title: 'Appearance', subtitle: 'Choose your preferred theme', current: 'Active', apply: 'Apply' },
        ede: { title: 'Asei Đrưh', subtitle: 'Hriêng asei đrưh kơ jia', current: 'Hruê anei', apply: 'Yua' }
    };
    const t = labels[appLang] || labels.vi;

    const handleApply = (themeId) => {
        applyTheme(themeId);
        setActiveTheme(themeId);
    };

    return (
        <div className="view-container" style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button onClick={onBack} className="btn-back">
                    <i className="fas fa-arrow-left"></i> {appLang === 'vi' ? 'Quay lại' : appLang === 'en' ? 'Back' : 'Lêt'}
                </button>
            </div>

            <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--coffee-dark)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-palette" style={{ color: 'var(--coffee-primary)' }}></i>
                    {t.title}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--gray-700)', opacity: 0.7, margin: 0 }}>{t.subtitle}</p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '16px'
            }}>
                {Object.values(themes).map((theme) => {
                    const isActive = activeTheme === theme.id;
                    return (
                        <div
                            key={theme.id}
                            onClick={() => handleApply(theme.id)}
                            style={{
                                background: 'var(--white, #fff)',
                                borderRadius: '16px',
                                border: isActive ? `2.5px solid ${theme.preview[0]}` : '2px solid var(--gray-200)',
                                padding: '18px',
                                cursor: 'pointer',
                                transition: 'all 0.25s ease',
                                boxShadow: isActive ? `0 4px 20px ${theme.preview[0]}30` : 'var(--shadow-sm)',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                            onMouseEnter={e => {
                                if (!isActive) e.currentTarget.style.transform = 'translateY(-3px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {/* Active badge */}
                            {isActive && (
                                <div style={{
                                    position: 'absolute', top: '12px', right: '12px',
                                    background: theme.preview[0], color: '#fff',
                                    fontSize: '10px', fontWeight: 700, padding: '3px 10px',
                                    borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px'
                                }}>
                                    <i className="fas fa-check-circle"></i> {t.current}
                                </div>
                            )}

                            {/* Color preview bar */}
                            <div style={{
                                display: 'flex', borderRadius: '10px', overflow: 'hidden',
                                height: '48px', marginBottom: '14px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                            }}>
                                {theme.preview.map((color, i) => (
                                    <div key={i} style={{
                                        flex: 1, background: color,
                                    }} />
                                ))}
                            </div>

                            {/* Theme info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: `linear-gradient(135deg, ${theme.preview[0]}, ${theme.preview[1]})`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontSize: '16px', flexShrink: 0
                                }}>
                                    <i className={theme.icon}></i>
                                </div>
                                <div>
                                    <div style={{
                                        fontWeight: 700, fontSize: '14px',
                                        color: isActive ? theme.preview[0] : 'var(--gray-900)'
                                    }}>
                                        {theme.name[appLang] || theme.name.vi}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ThemeSettings;
