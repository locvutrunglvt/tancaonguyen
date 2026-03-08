import React, { useState, useEffect } from 'react';
import pb from './pbClient';
import { translations } from './translations';
import './Dashboard.css';

const CARD_GRADIENTS = [
    { from: '#166534', to: '#22c55e', glow: 'rgba(22,101,52,0.3)' },
    { from: '#1e40af', to: '#3b82f6', glow: 'rgba(30,64,175,0.3)' },
    { from: '#92400e', to: '#d97706', glow: 'rgba(146,64,14,0.3)' },
    { from: '#7c3aed', to: '#a78bfa', glow: 'rgba(124,58,237,0.3)' },
    { from: '#0f766e', to: '#14b8a6', glow: 'rgba(15,118,110,0.3)' },
    { from: '#be185d', to: '#ec4899', glow: 'rgba(190,24,93,0.3)' },
    { from: '#c2410c', to: '#f97316', glow: 'rgba(194,65,12,0.3)' },
    { from: '#4338ca', to: '#6366f1', glow: 'rgba(67,56,202,0.3)' },
];

const STATUS_COLORS = {
    active: { icon: 'fa-check-circle' },
    planning: { icon: 'fa-clock' },
    completed: { icon: 'fa-flag-checkered' }
};

const ModelHome = ({ onSelectModel, onNavigate, appLang = 'vi', currentUser }) => {
    const t = translations[appLang] || translations.vi;
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({});
    const [pressedId, setPressedId] = useState(null);

    useEffect(() => { fetchModels(); }, []);

    const fetchModels = async () => {
        setLoading(true);
        try {
            const data = await pb.collection('demo_models').getFullList({ expand: 'farmer_id', sort: 'model_code' });
            setModels(data);
            const statsMap = {};
            for (const m of data) {
                try {
                    const [diaryCount, inspCount, consumCount] = await Promise.all([
                        pb.collection('model_diary').getList(1, 1, { filter: `model_id='${m.id}'` }).then(r => r.totalItems).catch(() => 0),
                        pb.collection('model_inspections').getList(1, 1, { filter: `model_id='${m.id}'` }).then(r => r.totalItems).catch(() => 0),
                        pb.collection('model_consumables').getList(1, 1, { filter: `model_id='${m.id}'` }).then(r => r.totalItems).catch(() => 0)
                    ]);
                    statsMap[m.id] = { diary: diaryCount, inspections: inspCount, consumables: consumCount };
                } catch { statsMap[m.id] = { diary: 0, inspections: 0, consumables: 0 }; }
            }
            setStats(statsMap);
        } catch (err) {
            console.error('Error fetching demo_models:', err.message);
            setModels([]);
        } finally {
            setLoading(false);
        }
    };

    const labels = {
        vi: {
            title: '08 MO HINH TRINH DIEN', subtitle: 'Bam vao mo hinh de xem chi tiet',
            farmer: 'Nong ho', area: 'Dien tich', inspections: 'Kiem tra', diary: 'Nhat ky',
            no_farmer: 'Chua gan nong ho', manage_all: 'Quan ly chung',
            all_farmers: 'Tat ca nong ho', all_training: 'Dao tao', finance: 'Tai chinh', ha: 'ha',
            costs: 'Tieu hao',
        },
        en: {
            title: '08 DEMONSTRATION MODELS', subtitle: 'Tap a model to explore',
            farmer: 'Farmer', area: 'Area', inspections: 'Inspections', diary: 'Diary',
            no_farmer: 'No farmer assigned', manage_all: 'General Management',
            all_farmers: 'All Farmers', all_training: 'Training', finance: 'Finance', ha: 'ha',
            costs: 'Costs',
        },
        ede: {
            title: '08 HDRUOM KLEI HRA', subtitle: 'Mnek hdruom ko dlang ting',
            farmer: 'Mnuih hma', area: 'Prong', inspections: 'Dlang', diary: 'Hdro',
            no_farmer: 'Ka mao mnuih', manage_all: 'Brua mdrong',
            all_farmers: 'Aboh mnuih', all_training: 'Hriam', finance: 'Prak', ha: 'ha',
            costs: 'Prak',
        },
    };
    const L = labels[appLang] || labels.vi;

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--coffee-primary)' }}></i>
                <p style={{ marginTop: '15px', color: '#64748b' }}>{t.loading}</p>
            </div>
        );
    }

    const displayModels = models.length > 0 ? models : Array.from({ length: 8 }, (_, i) => ({
        id: `placeholder-${i}`, model_code: `GL${String(i + 1).padStart(2, '0')}-XP`,
        model_name: `Mo hinh GL${String(i + 1).padStart(2, '0')}`, status: 'planning', _placeholder: true
    }));

    return (
        <div className="home-container">
            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h2 style={{
                    fontSize: '17px', fontWeight: 900, color: 'var(--coffee-dark)',
                    letterSpacing: '2px', margin: 0, textTransform: 'uppercase'
                }}>{L.title}</h2>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{L.subtitle}</p>
            </div>

            {/* Row 1: 5 cards, Row 2: 3 cards centered */}
            {[displayModels.slice(0, 5), displayModels.slice(5)].map((row, rowIdx) => (
                <div key={rowIdx} style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: rowIdx === 0 ? '16px' : '24px',
                    flexWrap: 'nowrap',
                    perspective: '1200px',
                }}>
                    {row.map((model, idx) => {
                        const realIdx = rowIdx * 5 + idx;
                        const grad = CARD_GRADIENTS[realIdx % CARD_GRADIENTS.length];
                        const sc = STATUS_COLORS[model.status] || STATUS_COLORS.planning;
                        const st = stats[model.id] || { diary: 0, inspections: 0, consumables: 0 };
                        const farmerName = model.expand?.farmer_id?.full_name;
                        const isPressed = pressedId === model.id;
                        const area = model.area || model.target_area;

                        return (
                            <div
                                key={model.id}
                                onClick={() => !model._placeholder && onSelectModel(model)}
                                onMouseEnter={() => setPressedId(model.id)}
                                onMouseLeave={() => setPressedId(null)}
                                onTouchStart={() => setPressedId(model.id)}
                                onTouchEnd={() => setTimeout(() => setPressedId(null), 600)}
                                style={{
                                    flex: '1 1 0',
                                    minWidth: 0,
                                    maxWidth: '220px',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    cursor: model._placeholder ? 'default' : 'pointer',
                                    opacity: model._placeholder ? 0.45 : 1,
                                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    transform: isPressed
                                        ? 'translateY(-6px) rotateX(2deg) scale(1.03)'
                                        : 'translateY(0) rotateX(0deg) scale(1)',
                                    transformStyle: 'preserve-3d',
                                    boxShadow: isPressed
                                        ? `0 16px 32px ${grad.glow}, 0 6px 12px rgba(0,0,0,0.1), 0 0 0 1px ${grad.to}30`
                                        : `0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)`,
                                    background: 'white',
                                }}
                            >
                                {/* Header bar with gradient */}
                                <div style={{
                                    background: `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
                                    padding: '10px 12px',
                                    color: 'white',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}>
                                    {/* 3D shine overlay */}
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                                        pointerEvents: 'none',
                                    }}></div>

                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '0.5px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                                {model.model_code}
                                            </div>
                                            <i className={`fas ${sc.icon}`} style={{ fontSize: '10px', opacity: 0.8 }}></i>
                                        </div>
                                        <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {model.name || model.model_name || '---'}
                                        </div>
                                    </div>
                                </div>

                                {/* Body */}
                                <div style={{ padding: '10px 12px' }}>
                                    {/* Farmer info */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                        <i className="fas fa-user" style={{ color: grad.from, fontSize: '10px', width: '14px' }}></i>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 600,
                                            color: farmerName ? 'var(--coffee-dark)' : '#94a3b8',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {farmerName || L.no_farmer}
                                        </span>
                                    </div>

                                    {/* Area + Location */}
                                    {(area || model.location || model.commune) && (
                                        <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: '#64748b', marginBottom: '6px', flexWrap: 'wrap' }}>
                                            {area && (
                                                <span><i className="fas fa-ruler-combined" style={{ marginRight: '3px', color: grad.from, fontSize: '9px' }}></i>{area} {L.ha}</span>
                                            )}
                                            {(model.location || model.commune) && (
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                                                    <i className="fas fa-map-marker-alt" style={{ marginRight: '3px', color: grad.from, fontSize: '9px' }}></i>
                                                    {model.location || model.commune}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Quick stats */}
                                    {!model._placeholder && (
                                        <div style={{
                                            display: 'flex', gap: '4px', marginTop: '8px',
                                            paddingTop: '8px', borderTop: '1px solid #f1f5f9'
                                        }}>
                                            <div style={{
                                                flex: 1, textAlign: 'center', padding: '5px 3px',
                                                background: 'linear-gradient(to bottom, #f0fdf4, #dcfce7)',
                                                borderRadius: '8px',
                                                boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
                                            }}>
                                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#166534' }}>{st.diary}</div>
                                                <div style={{ fontSize: '8px', color: '#15803d', fontWeight: 600 }}>{L.diary}</div>
                                            </div>
                                            <div style={{
                                                flex: 1, textAlign: 'center', padding: '5px 3px',
                                                background: 'linear-gradient(to bottom, #eff6ff, #dbeafe)',
                                                borderRadius: '8px',
                                                boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
                                            }}>
                                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e40af' }}>{st.inspections}</div>
                                                <div style={{ fontSize: '8px', color: '#1d4ed8', fontWeight: 600 }}>{L.inspections}</div>
                                            </div>
                                            <div style={{
                                                flex: 1, textAlign: 'center', padding: '5px 3px',
                                                background: 'linear-gradient(to bottom, #fefce8, #fef9c3)',
                                                borderRadius: '8px',
                                                boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
                                            }}>
                                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#854d0e' }}>{st.consumables}</div>
                                                <div style={{ fontSize: '8px', color: '#a16207', fontWeight: 600 }}>{L.costs}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}

            {/* Quick access buttons */}
            <div style={{
                background: 'white', borderRadius: '20px', padding: '20px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.04)', marginBottom: '20px'
            }}>
                <h4 style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>
                    {L.manage_all}
                </h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => onNavigate('farmers')} className="btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                        <i className="fas fa-id-card" style={{ marginRight: '6px' }}></i>{L.all_farmers}
                    </button>
                    <button onClick={() => onNavigate('training')} className="btn-primary" style={{ fontSize: '13px', padding: '8px 16px', background: 'var(--green-accent)' }}>
                        <i className="fas fa-graduation-cap" style={{ marginRight: '6px' }}></i>{L.all_training}
                    </button>
                    <button onClick={() => onNavigate('planning')} className="btn-primary" style={{ fontSize: '13px', padding: '8px 16px', background: 'var(--gold-accent)', color: '#3E2723' }}>
                        <i className="fas fa-clipboard-list" style={{ marginRight: '6px' }}></i>{L.finance}
                    </button>
                </div>
            </div>

            <footer className="dashboard-footer-branding">
                {t.footer_copyright || 'Ban quyen va phat trien boi Tan Cao Nguyen, 2026'}
            </footer>
        </div>
    );
};

export default ModelHome;
