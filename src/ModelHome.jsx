import React, { useState, useEffect } from 'react';
import pb from './pbClient';
import { translations } from './translations';
import './Dashboard.css';

const PAD_COLORS = [
    { bg: '#166534', light: '#22c55e', glow: 'rgba(22,101,52,0.35)' },
    { bg: '#1e40af', light: '#3b82f6', glow: 'rgba(30,64,175,0.35)' },
    { bg: '#92400e', light: '#d97706', glow: 'rgba(146,64,14,0.35)' },
    { bg: '#7c3aed', light: '#a78bfa', glow: 'rgba(124,58,237,0.35)' },
    { bg: '#0f766e', light: '#14b8a6', glow: 'rgba(15,118,110,0.35)' },
    { bg: '#be185d', light: '#ec4899', glow: 'rgba(190,24,93,0.35)' },
    { bg: '#c2410c', light: '#f97316', glow: 'rgba(194,65,12,0.35)' },
    { bg: '#4338ca', light: '#6366f1', glow: 'rgba(67,56,202,0.35)' },
];

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

            {/* Horizontal scroll pad grid */}
            <div style={{
                display: 'flex',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                gap: '14px',
                padding: '10px 4px 20px',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
            }}>
                {displayModels.map((model, idx) => {
                    const c = PAD_COLORS[idx % PAD_COLORS.length];
                    const st = stats[model.id] || { diary: 0, inspections: 0, consumables: 0 };
                    const farmerName = model.expand?.farmer_id?.full_name;
                    const isPressed = pressedId === model.id;
                    const area = model.area || model.target_area;
                    const totalRecs = st.diary + st.inspections + st.consumables;

                    return (
                        <div
                            key={model.id}
                            onClick={() => !model._placeholder && onSelectModel(model)}
                            onMouseEnter={() => setPressedId(model.id)}
                            onMouseLeave={() => setPressedId(null)}
                            onTouchStart={() => setPressedId(model.id)}
                            onTouchEnd={() => setTimeout(() => setPressedId(null), 500)}
                            style={{
                                flex: '0 0 auto',
                                width: '155px',
                                scrollSnapAlign: 'start',
                                cursor: model._placeholder ? 'default' : 'pointer',
                                opacity: model._placeholder ? 0.4 : 1,
                                perspective: '600px',
                            }}
                        >
                            {/* 3D Pad */}
                            <div style={{
                                width: '155px',
                                minHeight: '180px',
                                borderRadius: '18px',
                                background: `linear-gradient(145deg, ${c.bg}, ${c.light})`,
                                position: 'relative',
                                overflow: 'hidden',
                                transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                transform: isPressed
                                    ? 'translateY(-8px) rotateX(5deg) scale(1.05)'
                                    : 'translateY(0) rotateX(0) scale(1)',
                                transformStyle: 'preserve-3d',
                                boxShadow: isPressed
                                    ? `0 18px 35px ${c.glow}, 0 6px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)`
                                    : `0 6px 18px ${c.glow}, 0 2px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.15)`,
                            }}>
                                {/* 3D top shine */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
                                    background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)',
                                    borderRadius: '18px 18px 0 0',
                                    pointerEvents: 'none',
                                }}></div>

                                {/* Bottom edge shadow (3D depth) */}
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '6px',
                                    background: 'rgba(0,0,0,0.15)',
                                    borderRadius: '0 0 18px 18px',
                                    pointerEvents: 'none',
                                }}></div>

                                {/* Content */}
                                <div style={{
                                    position: 'relative', zIndex: 1,
                                    padding: '14px 12px 12px',
                                    display: 'flex', flexDirection: 'column',
                                    minHeight: '180px',
                                    color: 'white',
                                }}>
                                    {/* Model code - big & bold */}
                                    <div style={{
                                        fontSize: '22px', fontWeight: 900,
                                        letterSpacing: '1px',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                        marginBottom: '2px',
                                    }}>
                                        {model.model_code?.replace('-XP', '') || '---'}
                                    </div>

                                    {/* Model name */}
                                    <div style={{
                                        fontSize: '10px', opacity: 0.85,
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        marginBottom: '10px',
                                    }}>
                                        {model.name || model.model_name || '---'}
                                    </div>

                                    {/* Farmer */}
                                    <div style={{
                                        fontSize: '11px', fontWeight: 600,
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                        marginBottom: '4px',
                                        opacity: farmerName ? 1 : 0.6,
                                    }}>
                                        <i className="fas fa-user" style={{ fontSize: '9px' }}></i>
                                        <span style={{
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            maxWidth: '120px',
                                        }}>
                                            {farmerName || L.no_farmer}
                                        </span>
                                    </div>

                                    {/* Area */}
                                    {area && (
                                        <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '4px' }}>
                                            <i className="fas fa-ruler-combined" style={{ fontSize: '8px', marginRight: '4px' }}></i>
                                            {area} {L.ha}
                                        </div>
                                    )}

                                    {/* Location */}
                                    {(model.location || model.commune) && (
                                        <div style={{
                                            fontSize: '9px', opacity: 0.7,
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            <i className="fas fa-map-marker-alt" style={{ fontSize: '8px', marginRight: '3px' }}></i>
                                            {model.location || model.commune}
                                        </div>
                                    )}

                                    {/* Spacer */}
                                    <div style={{ flex: 1 }}></div>

                                    {/* Stats row at bottom */}
                                    {!model._placeholder && (
                                        <div style={{
                                            display: 'flex', gap: '4px', marginTop: '8px',
                                        }}>
                                            <div style={{
                                                flex: 1, textAlign: 'center',
                                                background: 'rgba(255,255,255,0.18)',
                                                borderRadius: '8px',
                                                padding: '5px 2px',
                                                backdropFilter: 'blur(4px)',
                                            }}>
                                                <div style={{ fontSize: '14px', fontWeight: 800 }}>{st.diary}</div>
                                                <div style={{ fontSize: '7px', fontWeight: 600, opacity: 0.8 }}>{L.diary}</div>
                                            </div>
                                            <div style={{
                                                flex: 1, textAlign: 'center',
                                                background: 'rgba(255,255,255,0.18)',
                                                borderRadius: '8px',
                                                padding: '5px 2px',
                                                backdropFilter: 'blur(4px)',
                                            }}>
                                                <div style={{ fontSize: '14px', fontWeight: 800 }}>{st.inspections}</div>
                                                <div style={{ fontSize: '7px', fontWeight: 600, opacity: 0.8 }}>{L.inspections}</div>
                                            </div>
                                            <div style={{
                                                flex: 1, textAlign: 'center',
                                                background: 'rgba(255,255,255,0.18)',
                                                borderRadius: '8px',
                                                padding: '5px 2px',
                                                backdropFilter: 'blur(4px)',
                                            }}>
                                                <div style={{ fontSize: '14px', fontWeight: 800 }}>{st.consumables}</div>
                                                <div style={{ fontSize: '7px', fontWeight: 600, opacity: 0.8 }}>{L.costs}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Ground shadow */}
                            <div style={{
                                width: '80%', height: '8px', margin: '4px auto 0',
                                background: `radial-gradient(ellipse, ${c.glow} 0%, transparent 70%)`,
                                borderRadius: '50%',
                                opacity: isPressed ? 0.3 : 0.6,
                                transition: 'opacity 0.3s',
                            }}></div>
                        </div>
                    );
                })}
            </div>

            {/* Quick access buttons */}
            <div style={{
                background: 'white', borderRadius: '20px', padding: '20px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.04)', marginBottom: '20px', marginTop: '10px',
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
