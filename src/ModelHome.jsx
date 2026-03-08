import React, { useState, useEffect } from 'react';
import pb from './pbClient';
import { getFileUrl } from './MediaUpload';
import { translations } from './translations';
import './Dashboard.css';

const STATUS_COLORS = {
    active: { bg: '#dcfce7', color: '#166534', icon: 'fa-check-circle' },
    planning: { bg: '#fef3c7', color: '#92400e', icon: 'fa-clock' },
    completed: { bg: '#dbeafe', color: '#1e40af', icon: 'fa-flag-checkered' }
};

const DATA_STATUS_LABELS = {
    vi: { full: 'Du lieu day du', partial: 'Du lieu so bo', pending: 'Chua co du lieu' },
    en: { full: 'Full data', partial: 'Partial data', pending: 'No data yet' },
    ede: { full: 'Mnau guh', partial: 'Mnau dlieh', pending: 'Ka mao mnau' }
};

const DATA_STATUS_COLORS = {
    full: { bg: '#dcfce7', color: '#166534' },
    partial: { bg: '#fef9c3', color: '#854d0e' },
    pending: { bg: '#fee2e2', color: '#991b1b' }
};

const ModelHome = ({ onSelectModel, onNavigate, appLang = 'vi', currentUser }) => {
    const t = translations[appLang] || translations.vi;
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({});

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        setLoading(true);
        try {
            const data = await pb.collection('demo_models').getFullList({
                expand: 'farmer_id',
                sort: 'model_code'
            });
            setModels(data);

            // Fetch stats for each model
            const statsMap = {};
            for (const m of data) {
                try {
                    const [diaryCount, inspCount, consumCount] = await Promise.all([
                        pb.collection('model_diary').getList(1, 1, { filter: `model_id='${m.id}'` }).then(r => r.totalItems).catch(() => 0),
                        pb.collection('model_inspections').getList(1, 1, { filter: `model_id='${m.id}'` }).then(r => r.totalItems).catch(() => 0),
                        pb.collection('model_consumables').getList(1, 1, { filter: `model_id='${m.id}'` }).then(r => r.totalItems).catch(() => 0)
                    ]);
                    statsMap[m.id] = { diary: diaryCount, inspections: inspCount, consumables: consumCount };
                } catch {
                    statsMap[m.id] = { diary: 0, inspections: 0, consumables: 0 };
                }
            }
            setStats(statsMap);
        } catch (err) {
            console.error('Error fetching demo_models:', err.message);
            // Collection might not exist yet
            setModels([]);
        } finally {
            setLoading(false);
        }
    };

    const labels = {
        vi: {
            title: '09 MO HINH TRINH DIEN',
            subtitle: 'Bam vao mo hinh de xem chi tiet',
            farmer: 'Nong ho',
            area: 'Dien tich',
            inspections: 'Kiem tra',
            diary: 'Nhat ky',
            no_farmer: 'Chua gan nong ho',
            manage_all: 'Quan ly chung',
            all_farmers: 'Tat ca nong ho',
            all_training: 'Dao tao',
            finance: 'Tai chinh',
            ha: 'ha'
        },
        en: {
            title: '09 DEMONSTRATION MODELS',
            subtitle: 'Click a model to view details',
            farmer: 'Farmer',
            area: 'Area',
            inspections: 'Inspections',
            diary: 'Diary',
            no_farmer: 'No farmer assigned',
            manage_all: 'General Management',
            all_farmers: 'All Farmers',
            all_training: 'Training',
            finance: 'Finance',
            ha: 'ha'
        },
        ede: {
            title: '09 HDRUOM KLEI HRA',
            subtitle: 'Mnek hdruom kơ dlang ting',
            farmer: 'Mnuih hma',
            area: 'Prong',
            inspections: 'Dlang',
            diary: 'Hdro',
            no_farmer: 'Ka mao mnuih',
            manage_all: 'Bruă mdrông',
            all_farmers: 'Aboh mnuih',
            all_training: 'Hriăm',
            finance: 'Prăk',
            ha: 'ha'
        }
    };
    const L = labels[appLang] || labels.vi;
    const dsLabels = DATA_STATUS_LABELS[appLang] || DATA_STATUS_LABELS.vi;

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--coffee-primary)' }}></i>
                <p style={{ marginTop: '15px', color: '#64748b' }}>{t.loading}</p>
            </div>
        );
    }

    // If no models exist yet, show placeholder grid
    const displayModels = models.length > 0 ? models : Array.from({ length: 9 }, (_, i) => ({
        id: `placeholder-${i}`,
        model_code: `GL${String(i + 1).padStart(2, '0')}-XP`,
        model_name: `Mo hinh GL${String(i + 1).padStart(2, '0')}`,
        status: 'planning',
        data_status: 'pending',
        _placeholder: true
    }));

    return (
        <div className="home-container">
            {/* Model Grid - 9 cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                {displayModels.map(model => {
                    const sc = STATUS_COLORS[model.status] || STATUS_COLORS.planning;
                    const dc = DATA_STATUS_COLORS[model.data_status] || DATA_STATUS_COLORS.pending;
                    const st = stats[model.id] || { diary: 0, inspections: 0, consumables: 0 };
                    const farmerName = model.expand?.farmer_id?.full_name;

                    return (
                        <div
                            key={model.id}
                            onClick={() => !model._placeholder && onSelectModel(model)}
                            style={{
                                background: 'white',
                                borderRadius: '20px',
                                overflow: 'hidden',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                                cursor: model._placeholder ? 'default' : 'pointer',
                                transition: 'all 0.25s ease',
                                border: '2px solid transparent',
                                opacity: model._placeholder ? 0.5 : 1
                            }}
                            className="model-home-card"
                        >
                            {/* Header bar */}
                            <div style={{
                                background: model.data_status === 'full'
                                    ? 'linear-gradient(135deg, #166534, #22c55e)'
                                    : model.data_status === 'partial'
                                        ? 'linear-gradient(135deg, #92400e, #d97706)'
                                        : 'linear-gradient(135deg, #6b7280, #9ca3af)',
                                padding: '16px 20px',
                                color: 'white'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1px' }}>
                                            {model.model_code}
                                        </div>
                                        <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                                            {model.model_name || '---'}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '4px 10px', borderRadius: '20px',
                                        background: 'rgba(255,255,255,0.2)',
                                        fontSize: '10px', fontWeight: 700
                                    }}>
                                        <i className={`fas ${sc.icon}`} style={{ marginRight: '4px' }}></i>
                                        {model.status?.toUpperCase()}
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div style={{ padding: '16px 20px' }}>
                                {/* Data status badge */}
                                <div style={{
                                    display: 'inline-block',
                                    padding: '3px 10px', borderRadius: '12px',
                                    background: dc.bg, color: dc.color,
                                    fontSize: '11px', fontWeight: 700, marginBottom: '12px'
                                }}>
                                    {dsLabels[model.data_status] || model.data_status}
                                </div>

                                {/* Farmer info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <i className="fas fa-user" style={{ color: 'var(--coffee-primary)', width: '16px' }}></i>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: farmerName ? 'var(--coffee-dark)' : '#94a3b8' }}>
                                        {farmerName || L.no_farmer}
                                    </span>
                                </div>

                                {/* Area + Location */}
                                {(model.target_area || model.commune) && (
                                    <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                                        {model.target_area && (
                                            <span><i className="fas fa-ruler-combined" style={{ marginRight: '4px' }}></i>{model.target_area} {L.ha}</span>
                                        )}
                                        {model.commune && (
                                            <span><i className="fas fa-map-marker-alt" style={{ marginRight: '4px' }}></i>{model.commune}</span>
                                        )}
                                    </div>
                                )}

                                {/* Quick stats */}
                                {!model._placeholder && (
                                    <div style={{
                                        display: 'flex', gap: '8px', marginTop: '12px',
                                        paddingTop: '12px', borderTop: '1px solid #f1f5f9'
                                    }}>
                                        <div style={{
                                            flex: 1, textAlign: 'center', padding: '6px',
                                            background: '#f0fdf4', borderRadius: '8px'
                                        }}>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#166534' }}>{st.diary}</div>
                                            <div style={{ fontSize: '9px', color: '#15803d', fontWeight: 600 }}>{L.diary}</div>
                                        </div>
                                        <div style={{
                                            flex: 1, textAlign: 'center', padding: '6px',
                                            background: '#eff6ff', borderRadius: '8px'
                                        }}>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e40af' }}>{st.inspections}</div>
                                            <div style={{ fontSize: '9px', color: '#1d4ed8', fontWeight: 600 }}>{L.inspections}</div>
                                        </div>
                                        <div style={{
                                            flex: 1, textAlign: 'center', padding: '6px',
                                            background: '#fefce8', borderRadius: '8px'
                                        }}>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#854d0e' }}>{st.consumables}</div>
                                            <div style={{ fontSize: '9px', color: '#a16207', fontWeight: 600 }}>
                                                {appLang === 'vi' ? 'Tieu hao' : appLang === 'en' ? 'Costs' : 'Prăk'}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick access buttons for general management */}
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
