import React, { useState, useRef } from 'react';
import { supabase } from './supabaseClient';

const MediaUpload = ({ entityType, entityId, currentUrl, onUploadSuccess, folder = 'general', appLang = 'vi' }) => {
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(currentUrl);
    const fileInputRef = useRef(null);

    const labels = {
        vi: { upload: 'Tải ảnh/video', change: 'Thay đổi', uploading: 'Đang tải...', error: 'Lỗi tải lên', success: 'Thành công' },
        en: { upload: 'Upload Media', change: 'Change', uploading: 'Uploading...', error: 'Upload error', success: 'Success' },
        ede: { upload: 'Čih ảnh/video', change: 'Mlih', uploading: 'Dữ...', error: 'Lỗi', success: 'KLă' }
    };

    const t = labels[appLang] || labels.vi;

    const handleFileChange = async (event) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                return;
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${entityId}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${entityType}/${folder}/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError, data } = await supabase.storage
                .from('project-media')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('project-media')
                .getPublicUrl(filePath);

            setPreviewUrl(publicUrl);
            if (onUploadSuccess) {
                onUploadSuccess(publicUrl);
            }
        } catch (error) {
            alert(`${t.error}: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    const isVideo = previewUrl && (previewUrl.endsWith('.mp4') || previewUrl.endsWith('.mov') || previewUrl.endsWith('.webm'));

    return (
        <div className="media-upload-container" style={{ margin: '10px 0' }}>
            <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                disabled={uploading}
                ref={fileInputRef}
                style={{ display: 'none' }}
            />

            <div className="media-preview-box" style={{
                width: '100%',
                minHeight: '120px',
                border: '2px dashed #e2e8f0',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: '#f8fafc',
                cursor: 'pointer',
                position: 'relative'
            }} onClick={triggerFileInput}>
                {previewUrl ? (
                    isVideo ? (
                        <video src={previewUrl} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} autoPlay muted loop />
                    ) : (
                        <img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                    )
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <i className="fas fa-cloud-upload-alt" style={{ fontSize: '32px', color: '#94a3b8', marginBottom: '8px' }}></i>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{uploading ? t.uploading : t.upload}</div>
                    </div>
                )}

                {previewUrl && !uploading && (
                    <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        fontSize: '10px',
                        padding: '4px',
                        textAlign: 'center'
                    }}>
                        {t.change}
                    </div>
                )}

                {uploading && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(255,255,255,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                    }}>
                        <div className="spinner" style={{ border: '3px solid #f3f3f3', borderTop: '3px solid #3498db', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 1s linear infinite' }}></div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default MediaUpload;
