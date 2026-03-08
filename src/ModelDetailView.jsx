import React, { useState, useEffect } from 'react';
import pb from './pbClient';
import { translations } from './translations';
import { getFileUrl } from './MediaUpload';
import './Dashboard.css';

const TABS = [
    { id: 'overview', icon: 'fa-info-circle', vi: 'Tong quan', en: 'Overview', ede: 'Klei dlieh' },
    { id: 'farmer', icon: 'fa-user', vi: 'Nong ho', en: 'Farmer', ede: 'Mnuih' },
    { id: 'farm', icon: 'fa-map', vi: 'Trang trai', en: 'Farm', ede: 'Hma' },
    { id: 'diary', icon: 'fa-book', vi: 'Nhat ky', en: 'Diary', ede: 'Hdro' },
    { id: 'inspect', icon: 'fa-clipboard-check', vi: 'Kiem tra', en: 'Inspect', ede: 'Dlang' },
    { id: 'consumable', icon: 'fa-receipt', vi: 'Tieu hao', en: 'Costs', ede: 'Prak' },
    { id: 'invest', icon: 'fa-chart-pie', vi: 'Dau tu', en: 'Invest', ede: 'Mnga' }
];

const ModelDetailView = ({ model, onBack, appLang = 'vi', currentUser }) => {
    const t = translations[appLang] || translations.vi;
    const [activeTab, setActiveTab] = useState('overview');
    const [farmer, setFarmer] = useState(null);
    const [farm, setFarm] = useState(null);
    const [members, setMembers] = useState([]);
    const [plots, setPlots] = useState([]);
    const [income, setIncome] = useState(null);
    const [diary, setDiary] = useState([]);
    const [inspections, setInspections] = useState([]);
    const [consumables, setConsumables] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (model) loadAllData();
    }, [model]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            // Load farmer info
            if (model.farmer_id) {
                const f = await pb.collection('farmers').getOne(model.farmer_id).catch(() => null);
                setFarmer(f);
                if (f) {
                    const [m, p, i] = await Promise.all([
                        pb.collection('household_members').getFullList({ filter: `farmer_id='${f.id}'` }).catch(() => []),
                        pb.collection('land_plots').getFullList({ filter: `farmer_id='${f.id}'` }).catch(() => []),
                        pb.collection('income_records').getFullList({ filter: `farmer_id='${f.id}'`, sort: '-year' }).catch(() => [])
                    ]);
                    setMembers(m);
                    setPlots(p);
                    setIncome(i[0] || null);
                }
            }
            // Load farm info
            if (model.farm_id) {
                const fm = await pb.collection('farm_baselines').getOne(model.farm_id).catch(() => null);
                setFarm(fm);
            }
            // Load model-specific data
            const [d, ins, con] = await Promise.all([
                pb.collection('model_diary').getFullList({ filter: `model_id='${model.id}'`, sort: '-diary_date', expand: 'author_id' }).catch(() => []),
                pb.collection('model_inspections').getFullList({ filter: `model_id='${model.id}'`, sort: '-inspection_date', expand: 'inspector_id' }).catch(() => []),
                pb.collection('model_consumables').getFullList({ filter: `model_id='${model.id}'`, sort: '-record_date' }).catch(() => [])
            ]);
            setDiary(d);
            setInspections(ins);
            setConsumables(con);
        } catch (err) {
            console.error('ModelDetail load error:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const InfoRow = ({ label, value, icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
            {icon && <i className={`fas ${icon}`} style={{ width: '20px', color: 'var(--coffee-primary)', textAlign: 'center' }}></i>}
            <span style={{ flex: 1, fontSize: '13px', color: '#64748b' }}>{label}</span>
            <span style={{ fontWeight: 600, color: 'var(--coffee-dark)', fontSize: '14px' }}>{value || '---'}</span>
        </div>
    );

    const SectionCard = ({ title, icon, children }) => (
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--coffee-dark)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className={`fas ${icon}`} style={{ color: 'var(--coffee-primary)' }}></i>{title}
            </h4>
            {children}
        </div>
    );

    // ===== TAB CONTENT =====

    const renderOverview = () => (
        <>
            <SectionCard title={appLang === 'vi' ? 'Thong tin mo hinh' : 'Model Info'} icon="fa-seedling">
                <InfoRow label="Ma mo hinh" value={model.model_code} icon="fa-hashtag" />
                <InfoRow label="Ten" value={model.model_name} icon="fa-tag" />
                <InfoRow label="Mo ta" value={model.description} icon="fa-align-left" />
                <InfoRow label="Xa" value={model.commune} icon="fa-map-marker-alt" />
                <InfoRow label="Thon" value={model.village} icon="fa-home" />
                <InfoRow label="Tinh" value={model.province || 'Gia Lai'} icon="fa-globe" />
                <InfoRow label="DT muc tieu" value={model.target_area ? `${model.target_area} ha` : null} icon="fa-ruler-combined" />
                <InfoRow label="Loai ca phe" value={model.coffee_type} icon="fa-mug-hot" />
                <InfoRow label="Trang thai" value={model.status?.toUpperCase()} icon="fa-flag" />
                <InfoRow label="Du lieu" value={model.data_status} icon="fa-database" />
            </SectionCard>

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                    { label: appLang === 'vi' ? 'Nhat ky' : 'Diary', count: diary.length, color: '#166534', bg: '#dcfce7', icon: 'fa-book' },
                    { label: appLang === 'vi' ? 'Kiem tra' : 'Inspections', count: inspections.length, color: '#1e40af', bg: '#dbeafe', icon: 'fa-clipboard-check' },
                    { label: appLang === 'vi' ? 'Tieu hao' : 'Costs', count: consumables.length, color: '#854d0e', bg: '#fef9c3', icon: 'fa-receipt' }
                ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                        <i className={`fas ${s.icon}`} style={{ fontSize: '20px', color: s.color }}></i>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, marginTop: '8px' }}>{s.count}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: s.color }}>{s.label}</div>
                    </div>
                ))}
            </div>
        </>
    );

    const renderFarmer = () => (
        <>
            {farmer ? (
                <>
                    <SectionCard title={appLang === 'vi' ? 'Chu ho mo hinh' : 'Model Owner'} icon="fa-user">
                        <InfoRow label="Ho ten" value={farmer.full_name} icon="fa-user" />
                        <InfoRow label="Ma" value={farmer.farmer_code} icon="fa-id-badge" />
                        <InfoRow label="Gioi tinh" value={farmer.gender} icon="fa-venus-mars" />
                        <InfoRow label="Dan toc" value={farmer.ethnicity} icon="fa-users" />
                        <InfoRow label="SDT" value={farmer.phone} icon="fa-phone" />
                        <InfoRow label="Thon" value={farmer.village} icon="fa-home" />
                        <InfoRow label="Xa" value={farmer.commune} icon="fa-map" />
                        <InfoRow label="Kinh te ho" value={farmer.economic_class} icon="fa-chart-bar" />
                        <InfoRow label="Nam trong ca phe" value={farmer.coffee_years ? `${farmer.coffee_years} nam` : null} icon="fa-coffee" />
                        <InfoRow label="Hoc van" value={farmer.education} icon="fa-graduation-cap" />
                        <InfoRow label="Thanh vien HTX" value={farmer.cooperative_member ? 'Co' : 'Khong'} icon="fa-handshake" />
                    </SectionCard>

                    {members.length > 0 && (
                        <SectionCard title={`Thanh vien ho (${members.length})`} icon="fa-people-arrows">
                            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Ten</th>
                                        <th style={{ padding: '8px' }}>GT</th>
                                        <th style={{ padding: '8px' }}>Nam sinh</th>
                                        <th style={{ padding: '8px' }}>Quan he</th>
                                        <th style={{ padding: '8px' }}>Tham gia SX</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map(m => (
                                        <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{m.member_name}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>{m.gender}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>{m.birth_year}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>{m.relation_to_head}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                {m.coffee_participation ? <i className="fas fa-check" style={{ color: '#22c55e' }}></i> : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </SectionCard>
                    )}

                    {income && (
                        <SectionCard title={`Thu nhap nam ${income.year || 2025}`} icon="fa-coins">
                            <InfoRow label="Tong thu nhap rong" value={income.total_income ? `${income.total_income} tr.d` : null} icon="fa-wallet" />
                            <InfoRow label="Tu ca phe (rong)" value={income.coffee_net ? `${income.coffee_net} tr.d` : null} icon="fa-mug-hot" />
                            <InfoRow label="Doanh thu ca phe" value={income.coffee_revenue ? `${income.coffee_revenue} tr.d` : null} icon="fa-arrow-up" />
                            <InfoRow label="Chi phi ca phe" value={income.coffee_cost ? `${income.coffee_cost} tr.d` : null} icon="fa-arrow-down" />
                            <InfoRow label="San luong" value={income.production_tons ? `${income.production_tons} tan` : null} icon="fa-box" />
                            <InfoRow label="Ty trong NN" value={income.agri_income_ratio ? `${(income.agri_income_ratio * 100).toFixed(0)}%` : null} icon="fa-percent" />
                        </SectionCard>
                    )}
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <i className="fas fa-user-slash" style={{ fontSize: '40px', marginBottom: '15px' }}></i>
                    <p>{appLang === 'vi' ? 'Chua gan nong ho cho mo hinh nay' : 'No farmer assigned yet'}</p>
                </div>
            )}
        </>
    );

    const renderFarm = () => (
        <>
            {farm ? (
                <SectionCard title={appLang === 'vi' ? 'Trang trai tham gia mo hinh' : 'Farm in Model'} icon="fa-map-marked-alt">
                    <InfoRow label="Ten" value={farm.farm_name} icon="fa-tag" />
                    <InfoRow label="Tong DT" value={farm.total_area ? `${farm.total_area} ha` : null} icon="fa-ruler" />
                    <InfoRow label="DT ca phe" value={farm.coffee_area ? `${farm.coffee_area} ha` : null} icon="fa-leaf" />
                    <InfoRow label="DT xen canh" value={farm.intercrop_area ? `${farm.intercrop_area} ha` : null} icon="fa-tree" />
                    <InfoRow label="Cay xen" value={farm.intercrop_details} icon="fa-seedling" />
                    <InfoRow label="pH dat" value={farm.soil_ph} icon="fa-flask" />
                    <InfoRow label="Loai dat" value={farm.soil_type} icon="fa-mountain" />
                    <InfoRow label="Do doc" value={farm.slope} icon="fa-signal" />
                    <InfoRow label="Nguon nuoc" value={farm.water_source} icon="fa-tint" />
                    <InfoRow label="Tuoi tieu" value={farm.irrigation_system} icon="fa-shower" />
                    <InfoRow label="Do cao" value={farm.elevation ? `${farm.elevation}m` : null} icon="fa-arrow-up" />
                    <InfoRow label="GPS" value={farm.gps_lat && farm.gps_long ? `${farm.gps_lat}, ${farm.gps_long}` : null} icon="fa-map-pin" />
                </SectionCard>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <i className="fas fa-map" style={{ fontSize: '40px', marginBottom: '15px' }}></i>
                    <p>{appLang === 'vi' ? 'Chua gan trang trai' : 'No farm assigned yet'}</p>
                </div>
            )}

            {plots.length > 0 && (
                <SectionCard title={`Cac manh dat cua ho (${plots.length})`} icon="fa-th-large">
                    {plots.map(p => (
                        <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--coffee-dark)' }}>{p.plot_name || 'Manh dat'}</div>
                            <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                <span>{p.area_ha} ha</span>
                                {p.tree_count && <span>{p.tree_count} goc</span>}
                                {p.yield_current && <span>SL: {p.yield_current}</span>}
                                {p.intercrop && <span>Xen: {p.intercrop_species}</span>}
                            </div>
                        </div>
                    ))}
                </SectionCard>
            )}
        </>
    );

    const renderDiary = () => (
        <SectionCard title={`Nhat ky canh tac (${diary.length})`} icon="fa-book">
            {diary.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                    {appLang === 'vi' ? 'Chua co nhat ky nao' : 'No diary entries yet'}
                </p>
            ) : (
                diary.map(d => (
                    <div key={d.id} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--coffee-dark)' }}>
                                <i className="fas fa-calendar" style={{ marginRight: '6px', color: 'var(--coffee-primary)' }}></i>
                                {d.diary_date?.split('T')[0] || d.diary_date?.split(' ')[0]}
                            </span>
                            <span style={{
                                padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                                background: '#f0fdf4', color: '#166534'
                            }}>{d.activity_type}</span>
                        </div>
                        <p style={{ fontSize: '13px', margin: '6px 0', color: '#475569' }}>{d.description}</p>
                        {d.material_name && (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                Vat tu: {d.material_name} {d.material_amount && `- ${d.material_amount} ${d.material_unit || ''}`}
                            </div>
                        )}
                        {(d.labor_cost || d.material_cost) && (
                            <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                                Chi phi: {((d.labor_cost || 0) + (d.material_cost || 0)).toLocaleString()} d
                            </div>
                        )}
                    </div>
                ))
            )}
        </SectionCard>
    );

    const renderInspections = () => (
        <SectionCard title={`Kiem tra (${inspections.length})`} icon="fa-clipboard-check">
            {inspections.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                    {appLang === 'vi' ? 'Chua co kiem tra nao' : 'No inspections yet'}
                </p>
            ) : (
                inspections.map(ins => (
                    <div key={ins.id} style={{ padding: '12px', marginBottom: '10px', background: '#f8fafc', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px' }}>
                                {ins.inspection_date?.split('T')[0] || ins.inspection_date?.split(' ')[0]}
                            </span>
                            <span style={{
                                padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                                background: ins.inspection_type === 'quarterly' ? '#dbeafe' : ins.inspection_type === 'monthly' ? '#f3e8ff' : '#fef3c7',
                                color: ins.inspection_type === 'quarterly' ? '#1e40af' : ins.inspection_type === 'monthly' ? '#7c3aed' : '#92400e'
                            }}>
                                {ins.inspection_type}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                            <div>Sinh truong: <b>{ins.growth_quality || '-'}</b></div>
                            <div>Sau benh: <b>{ins.pest_status || '-'}</b></div>
                            <div>Dat: <b>{ins.soil_condition || '-'}</b></div>
                            <div>Nuoc: <b>{ins.water_status || '-'}</b></div>
                        </div>
                        {ins.recommendations && (
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
                                Khuyen nghi: {ins.recommendations}
                            </div>
                        )}
                    </div>
                ))
            )}
        </SectionCard>
    );

    const renderConsumables = () => {
        const totalCost = consumables.reduce((s, c) => s + (c.total_cost || 0), 0);
        const byCat = {};
        consumables.forEach(c => {
            byCat[c.category] = (byCat[c.category] || 0) + (c.total_cost || 0);
        });

        return (
            <>
                <div style={{
                    background: 'linear-gradient(135deg, #92400e, #d97706)', borderRadius: '16px',
                    padding: '20px', color: 'white', textAlign: 'center', marginBottom: '16px'
                }}>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>{appLang === 'vi' ? 'Tong tieu hao' : 'Total Costs'}</div>
                    <div style={{ fontSize: '32px', fontWeight: 800 }}>{totalCost.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>VND</div>
                </div>

                {Object.keys(byCat).length > 0 && (
                    <SectionCard title={appLang === 'vi' ? 'Theo danh muc' : 'By Category'} icon="fa-layer-group">
                        {Object.entries(byCat).map(([cat, total]) => (
                            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '13px', textTransform: 'capitalize' }}>{cat}</span>
                                <span style={{ fontWeight: 700, color: 'var(--coffee-dark)' }}>{total.toLocaleString()}</span>
                            </div>
                        ))}
                    </SectionCard>
                )}

                <SectionCard title={`Chi tiet (${consumables.length})`} icon="fa-receipt">
                    {consumables.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Chua co du lieu</p>
                    ) : (
                        consumables.map(c => (
                            <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600 }}>{c.item_name}</span>
                                    <span style={{ color: '#dc2626', fontWeight: 700 }}>{(c.total_cost || 0).toLocaleString()}</span>
                                </div>
                                <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                                    {c.record_date?.split('T')[0] || c.record_date?.split(' ')[0]} | {c.category} {c.quantity ? `| ${c.quantity} ${c.unit || ''}` : ''}
                                </div>
                            </div>
                        ))
                    )}
                </SectionCard>
            </>
        );
    };

    const renderInvest = () => {
        const diaryCost = diary.reduce((s, d) => s + (d.labor_cost || 0) + (d.material_cost || 0), 0);
        const consumCost = consumables.reduce((s, c) => s + (c.total_cost || 0), 0);
        const totalInvest = diaryCost + consumCost;

        return (
            <>
                <div style={{
                    background: 'linear-gradient(135deg, #1e40af, #3b82f6)', borderRadius: '16px',
                    padding: '20px', color: 'white', textAlign: 'center', marginBottom: '16px'
                }}>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>{appLang === 'vi' ? 'Tong dau tu mo hinh' : 'Total Model Investment'}</div>
                    <div style={{ fontSize: '32px', fontWeight: 800 }}>{totalInvest.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>VND</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#166534' }}>{appLang === 'vi' ? 'Tu nhat ky' : 'From Diary'}</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#166534' }}>{diaryCost.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#fef9c3', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#854d0e' }}>{appLang === 'vi' ? 'Tu tieu hao' : 'From Consumables'}</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#854d0e' }}>{consumCost.toLocaleString()}</div>
                    </div>
                </div>

                {income && (
                    <SectionCard title={appLang === 'vi' ? 'So sanh thu nhap nong ho' : 'Farmer Income Comparison'} icon="fa-balance-scale">
                        <InfoRow label="Thu nhap rong ho" value={income.total_income ? `${income.total_income} tr.d` : null} icon="fa-wallet" />
                        <InfoRow label="Dau tu mo hinh" value={`${(totalInvest / 1000000).toFixed(1)} tr.d`} icon="fa-piggy-bank" />
                        <InfoRow label="Doanh thu ca phe" value={income.coffee_revenue ? `${income.coffee_revenue} tr.d` : null} icon="fa-mug-hot" />
                    </SectionCard>
                )}
            </>
        );
    };

    const tabContent = {
        overview: renderOverview,
        farmer: renderFarmer,
        farm: renderFarm,
        diary: renderDiary,
        inspect: renderInspections,
        consumable: renderConsumables,
        invest: renderInvest
    };

    return (
        <div className="view-container animate-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <button onClick={onBack} className="btn-back">
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--coffee-dark)' }}>
                        <span style={{ color: 'var(--coffee-primary)', fontWeight: 800 }}>{model.model_code}</span> - {model.model_name}
                    </h2>
                </div>
            </div>

            {/* Tab Bar */}
            <div style={{
                display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '20px',
                padding: '4px', background: '#f1f5f9', borderRadius: '14px',
                WebkitOverflowScrolling: 'touch'
            }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 'none', padding: '8px 14px', border: 'none', borderRadius: '10px',
                            background: activeTab === tab.id ? 'white' : 'transparent',
                            color: activeTab === tab.id ? 'var(--coffee-dark)' : '#64748b',
                            fontWeight: activeTab === tab.id ? 700 : 500,
                            fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
                            boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        <i className={`fas ${tab.icon}`} style={{ marginRight: '5px' }}></i>
                        {tab[appLang] || tab.vi}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--coffee-primary)' }}></i>
                </div>
            ) : (
                tabContent[activeTab]?.()
            )}
        </div>
    );
};

export default ModelDetailView;
