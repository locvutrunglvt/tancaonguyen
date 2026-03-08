import React, { useState, useEffect } from 'react';
import pb from './pbClient';
import { translations } from './translations';
import './Dashboard.css';

// Sphere gradient colors per model index
const SPHERE_GRADIENTS = [
    { from: '#166534', to: '#4ade80', glow: 'rgba(22,101,52,0.35)' },
    { from: '#1e40af', to: '#60a5fa', glow: 'rgba(30,64,175,0.35)' },
    { from: '#92400e', to: '#fbbf24', glow: 'rgba(146,64,14,0.35)' },
    { from: '#7c3aed', to: '#c084fc', glow: 'rgba(124,58,237,0.35)' },
    { from: '#0f766e', to: '#2dd4bf', glow: 'rgba(15,118,110,0.35)' },
    { from: '#be185d', to: '#f472b6', glow: 'rgba(190,24,93,0.35)' },
    { from: '#c2410c', to: '#fb923c', glow: 'rgba(194,65,12,0.35)' },
    { from: '#4338ca', to: '#818cf8', glow: 'rgba(67,56,202,0.35)' },
];

const ModelHome = ({ onSelectModel, onNavigate, appLang = 'vi', currentUser }) => {
    const t = translations[appLang] || translations.vi;
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({});
    const [hoveredId, setHoveredId] = useState(null);

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
        vi: { title: '08 MO HINH TRINH DIEN', subtitle: 'Bam vao mo hinh de xem chi tiet', manage_all: 'Quan ly chung', all_farmers: 'Tat ca nong ho', all_training: 'Dao tao', finance: 'Tai chinh', ha: 'ha' },
        en: { title: '08 DEMONSTRATION MODELS', subtitle: 'Tap a model sphere to explore', manage_all: 'General Management', all_farmers: 'All Farmers', all_training: 'Training', finance: 'Finance', ha: 'ha' },
        ede: { title: '08 HDRUOM KLEI HRA', subtitle: 'Mnek hdruom ko dlang ting', manage_all: 'Brua mdrong', all_farmers: 'Aboh mnuih', all_training: 'Hriam', finance: 'Prak', ha: 'ha' },
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
        model_name: `Mo hinh GL${String(i + 1).padStart(2, '0')}`, status: 'planning', data_status: 'pending', _placeholder: true
    }));

    return (
        <div className="home-container">
            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <h2 style={{
                    fontSize: '18px', fontWeight: 900, color: 'var(--coffee-dark)',
                    letterSpacing: '2px', margin: 0, textTransform: 'uppercase'
                }}>{L.title}</h2>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>{L.subtitle}</p>
            </div>

            {/* 3D Sphere Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '24px',
                marginBottom: '30px',
                perspective: '800px',
                padding: '10px',
            }}>
                {displayModels.map((model, idx) => {
                    const grad = SPHERE_GRADIENTS[idx % SPHERE_GRADIENTS.length];
                    const st = stats[model.id] || { diary: 0, inspections: 0, consumables: 0 };
                    const farmerName = model.expand?.farmer_id?.full_name;
                    const isHovered = hoveredId === model.id;
                    const totalRecords = st.diary + st.inspections + st.consumables;
                    const area = model.area || model.target_area;

                    return (
                        <div
                            key={model.id}
                            onClick={() => !model._placeholder && onSelectModel(model)}
                            onMouseEnter={() => setHoveredId(model.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onTouchStart={() => setHoveredId(model.id)}
                            onTouchEnd={() => setTimeout(() => setHoveredId(null), 1500)}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                cursor: model._placeholder ? 'default' : 'pointer',
                                opacity: model._placeholder ? 0.4 : 1,
                                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                transform: isHovered ? 'translateY(-8px) scale(1.08)' : 'translateY(0) scale(1)',
                                transformStyle: 'preserve-3d',
                            }}
                        >
                            {/* Sphere */}
                            <div style={{
                                width: '110px', height: '110px', borderRadius: '50%',
                                background: `radial-gradient(circle at 35% 30%, ${grad.to}, ${grad.from} 70%)`,
                                boxShadow: isHovered
                                    ? `0 16px 40px ${grad.glow}, 0 0 20px ${grad.glow}, inset 0 -8px 20px rgba(0,0,0,0.25)`
                                    : `0 8px 24px ${grad.glow}, inset 0 -6px 16px rgba(0,0,0,0.2)`,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                position: 'relative',
                                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            }}>
                                {/* Shine highlight */}
                                <div style={{
                                    position: 'absolute', top: '12px', left: '22px',
                                    width: '30px', height: '18px', borderRadius: '50%',
                                    background: 'radial-gradient(ellipse, rgba(255,255,255,0.55), transparent)',
                                    transform: 'rotate(-25deg)',
                                }}></div>

                                {/* Model code */}
                                <div style={{
                                    fontSize: '18px', fontWeight: 900, color: 'white',
                                    textShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                    letterSpacing: '1px', zIndex: 1,
                                }}>
                                    {model.model_code.split('-')[0]}
                                </div>

                                {/* Area badge */}
                                {area && (
                                    <div style={{
                                        fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.85)',
                                        marginTop: '2px', zIndex: 1,
                                    }}>
                                        {area} {L.ha}
                                    </div>
                                )}

                                {/* Record count ring */}
                                {totalRecords > 0 && (
                                    <div style={{
                                        position: 'absolute', top: '-4px', right: '-4px',
                                        width: '26px', height: '26px', borderRadius: '50%',
                                        background: '#ef4444', color: 'white',
                                        fontSize: '11px', fontWeight: 800,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
                                        border: '2px solid white',
                                    }}>
                                        {totalRecords}
                                    </div>
                                )}
                            </div>

                            {/* Shadow on ground */}
                            <div style={{
                                width: isHovered ? '80px' : '70px',
                                height: '10px', borderRadius: '50%',
                                background: 'radial-gradient(ellipse, rgba(0,0,0,0.15), transparent)',
                                marginTop: isHovered ? '12px' : '8px',
                                transition: 'all 0.4s ease',
                            }}></div>

                            {/* Farmer name */}
                            <div style={{
                                marginTop: '8px', textAlign: 'center', maxWidth: '130px',
                            }}>
                                <div style={{
                                    fontSize: '12px', fontWeight: 700, color: 'var(--coffee-dark)',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {farmerName || (model.name || model.model_name || '---')}
                                </div>
                                {farmerName && (
                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                                        {model.location || model.commune || ''}
                                    </div>
                                )}
                            </div>

                            {/* Hover detail card */}
                            {isHovered && !model._placeholder && (
                                <div style={{
                                    marginTop: '8px', background: 'white', borderRadius: '12px',
                                    padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                                    minWidth: '140px', fontSize: '11px',
                                    animation: 'fadeIn 0.2s ease',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: '#166534' }}><i className="fas fa-book" style={{ marginRight: '4px' }}></i>{appLang === 'vi' ? 'Nhat ky' : 'Diary'}</span>
                                        <b style={{ color: '#166534' }}>{st.diary}</b>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: '#1e40af' }}><i className="fas fa-clipboard-check" style={{ marginRight: '4px' }}></i>{appLang === 'vi' ? 'Kiem tra' : 'Inspect'}</span>
                                        <b style={{ color: '#1e40af' }}>{st.inspections}</b>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#854d0e' }}><i className="fas fa-receipt" style={{ marginRight: '4px' }}></i>{appLang === 'vi' ? 'Tieu hao' : 'Costs'}</span>
                                        <b style={{ color: '#854d0e' }}>{st.consumables}</b>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

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

            {/* Inline CSS animations */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default ModelHome;
