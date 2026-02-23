import React, { useState } from 'react';
import pb from './pbClient';
import { translations } from './translations';

const COLLECTIONS = [
    'farmers',
    'farm_baselines',
    'coffee_models',
    'annual_activities',
    'training_records',
    'financial_records'
];

const BackupRestore = ({ onBack, appLang = 'vi', currentUser }) => {
    const t = translations[appLang] || translations.vi;
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [counts, setCounts] = useState(null);

    const labels = {
        vi: {
            title: 'Sao luu & Phuc hoi Du lieu',
            backup_btn: 'Sao luu toan bo du lieu',
            backup_desc: 'Tai xuong file JSON chua toan bo du lieu cac bang: Nong dan, Trang trai, Mo hinh, Hoat dong, Dao tao, Tai chinh.',
            restore_btn: 'Phuc hoi du lieu tu file',
            restore_desc: 'Tai len file sao luu (.json) da tai truoc do de phuc hoi du lieu.',
            restore_warn: 'Luu y: Phuc hoi se THEM du lieu moi, khong xoa du lieu cu.',
            backing_up: 'Dang sao luu...',
            restoring: 'Dang phuc hoi...',
            done_backup: 'Sao luu thanh cong!',
            done_restore: 'Phuc hoi thanh cong!',
            records: 'ban ghi',
            error: 'Loi',
            no_permission: 'Ban khong co quyen thuc hien chuc nang nay.',
            confirm_restore: 'Ban co chac muon phuc hoi du lieu tu file sao luu? Du lieu moi se duoc THEM vao, du lieu cu khong bi xoa.',
            file_invalid: 'File khong hop le. Vui long chon file sao luu TCN (.json).'
        },
        en: {
            title: 'Backup & Restore Data',
            backup_btn: 'Backup all data',
            backup_desc: 'Download a JSON file containing all data: Farmers, Farms, Models, Activities, Training, Finance.',
            restore_btn: 'Restore from file',
            restore_desc: 'Upload a previously downloaded backup file (.json) to restore data.',
            restore_warn: 'Note: Restore will ADD new data, not delete existing data.',
            backing_up: 'Backing up...',
            restoring: 'Restoring...',
            done_backup: 'Backup complete!',
            done_restore: 'Restore complete!',
            records: 'records',
            error: 'Error',
            no_permission: 'You do not have permission for this feature.',
            confirm_restore: 'Are you sure you want to restore data from the backup file? New data will be ADDED, existing data will not be deleted.',
            file_invalid: 'Invalid file. Please select a TCN backup file (.json).'
        },
        ede: {
            title: 'Pioh & Lom Hdra Mnau',
            backup_btn: 'Pioh aboh mnau',
            backup_desc: 'Mtruh file JSON dum aboh mnau.',
            restore_btn: 'Lom hdra meng file',
            restore_desc: 'Upload file pioh (.json).',
            restore_warn: 'Lom hdra jing THIM mnau mrui.',
            backing_up: 'Hlak pioh...',
            restoring: 'Hlak lom hdra...',
            done_backup: 'Pioh jing leh!',
            done_restore: 'Lom hdra jing leh!',
            records: 'mnau',
            error: 'Soh',
            no_permission: 'Ih mao droit pioh.',
            confirm_restore: 'Ih binh lom hdra mnau?',
            file_invalid: 'File ih jing.'
        }
    };

    const L = labels[appLang] || labels.vi;

    const handleBackup = async () => {
        if (currentUser?.role !== 'Admin') {
            alert(L.no_permission);
            return;
        }

        setIsLoading(true);
        setProgress(L.backing_up);
        const backup = {
            _meta: {
                app: 'TCN',
                version: '1.0',
                date: new Date().toISOString(),
                user: currentUser?.email || 'unknown'
            }
        };

        const recordCounts = {};

        try {
            for (const col of COLLECTIONS) {
                setProgress(`${L.backing_up} ${col}...`);
                const data = await pb.collection(col).getFullList();
                backup[col] = data.map(record => {
                    // Strip PB system metadata, keep only user data
                    const { collectionId, collectionName, expand, ...clean } = record;
                    return clean;
                });
                recordCounts[col] = data.length;
            }

            setCounts(recordCounts);

            // Download as JSON file
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            a.href = url;
            a.download = `TCN_backup_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setProgress(L.done_backup);
            alert(L.done_backup);
        } catch (err) {
            setProgress(`${L.error}: ${err.message}`);
            alert(`${L.error}: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (currentUser?.role !== 'Admin') {
            alert(L.no_permission);
            return;
        }

        if (!window.confirm(L.confirm_restore)) {
            e.target.value = '';
            return;
        }

        setIsLoading(true);
        setProgress(L.restoring);

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data._meta || data._meta.app !== 'TCN') {
                alert(L.file_invalid);
                setIsLoading(false);
                setProgress('');
                e.target.value = '';
                return;
            }

            const recordCounts = {};
            let totalCreated = 0;

            for (const col of COLLECTIONS) {
                if (!data[col] || !Array.isArray(data[col])) continue;
                setProgress(`${L.restoring} ${col}...`);
                let created = 0;

                for (const record of data[col]) {
                    try {
                        const { id, created: _c, updated: _u, ...fields } = record;
                        await pb.collection(col).create(fields);
                        created++;
                    } catch (err) {
                        console.warn(`Skip ${col} record:`, err.message);
                    }
                }

                recordCounts[col] = created;
                totalCreated += created;
            }

            setCounts(recordCounts);
            setProgress(`${L.done_restore} (${totalCreated} ${L.records})`);
            alert(`${L.done_restore}\n${totalCreated} ${L.records}`);
        } catch (err) {
            setProgress(`${L.error}: ${err.message}`);
            alert(`${L.error}: ${err.message}`);
        } finally {
            setIsLoading(false);
            e.target.value = '';
        }
    };

    const colLabels = {
        farmers: t.farmers || 'Nong dan',
        farm_baselines: t.farms || 'Trang trai',
        coffee_models: t.model || 'Mo hinh',
        annual_activities: t.activities || 'Hoat dong',
        training_records: t.training || 'Dao tao',
        financial_records: t.planning || 'Tai chinh'
    };

    return (
        <div className="view-container animate-in">
            <div className="table-actions" style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
                <button onClick={onBack} className="btn-back">
                    <i className="fas fa-arrow-left"></i> {t.back}
                </button>
            </div>

            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{
                    background: 'white', borderRadius: '24px', padding: '30px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '20px'
                }}>
                    <h2 style={{ color: 'var(--coffee-dark)', marginBottom: '25px', fontSize: '20px' }}>
                        <i className="fas fa-database" style={{ marginRight: '10px', color: 'var(--coffee-primary)' }}></i>
                        {L.title}
                    </h2>

                    {/* BACKUP */}
                    <div style={{
                        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px',
                        padding: '20px', marginBottom: '20px'
                    }}>
                        <h4 style={{ color: '#166534', marginBottom: '8px' }}>
                            <i className="fas fa-cloud-download-alt" style={{ marginRight: '8px' }}></i>
                            {L.backup_btn}
                        </h4>
                        <p style={{ fontSize: '13px', color: '#15803d', marginBottom: '15px', lineHeight: 1.5 }}>
                            {L.backup_desc}
                        </p>
                        <button
                            onClick={handleBackup}
                            disabled={isLoading}
                            className="btn-primary"
                            style={{ width: '100%', padding: '12px', fontSize: '15px' }}
                        >
                            <i className="fas fa-download" style={{ marginRight: '8px' }}></i>
                            {isLoading ? progress : L.backup_btn}
                        </button>
                    </div>

                    {/* RESTORE */}
                    <div style={{
                        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px',
                        padding: '20px'
                    }}>
                        <h4 style={{ color: '#1e40af', marginBottom: '8px' }}>
                            <i className="fas fa-cloud-upload-alt" style={{ marginRight: '8px' }}></i>
                            {L.restore_btn}
                        </h4>
                        <p style={{ fontSize: '13px', color: '#1d4ed8', marginBottom: '8px', lineHeight: 1.5 }}>
                            {L.restore_desc}
                        </p>
                        <p style={{ fontSize: '12px', color: '#dc2626', marginBottom: '15px', fontWeight: 600 }}>
                            <i className="fas fa-exclamation-triangle" style={{ marginRight: '4px' }}></i>
                            {L.restore_warn}
                        </p>
                        <label style={{
                            display: 'block', width: '100%', padding: '12px', textAlign: 'center',
                            background: '#3b82f6', color: 'white', borderRadius: '12px', cursor: 'pointer',
                            fontWeight: 700, fontSize: '15px'
                        }}>
                            <i className="fas fa-upload" style={{ marginRight: '8px' }}></i>
                            {isLoading ? progress : L.restore_btn}
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleRestore}
                                disabled={isLoading}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>

                    {/* COUNTS */}
                    {counts && (
                        <div style={{
                            marginTop: '20px', background: '#fefce8', border: '1px solid #fde68a',
                            borderRadius: '16px', padding: '15px'
                        }}>
                            <h4 style={{ fontSize: '13px', color: '#92400e', marginBottom: '10px' }}>
                                <i className="fas fa-chart-bar" style={{ marginRight: '6px' }}></i>
                                {L.records}:
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {COLLECTIONS.map(col => (
                                    <div key={col} style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        padding: '6px 10px', background: 'white', borderRadius: '8px',
                                        fontSize: '13px'
                                    }}>
                                        <span style={{ color: '#78716c' }}>{colLabels[col]}</span>
                                        <span style={{ fontWeight: 700, color: '#4B3621' }}>
                                            {counts[col] ?? 0}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BackupRestore;
