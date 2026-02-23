import React, { useState, useRef } from 'react';
import pb from './pbClient';

const MediaUpload = ({ entityType, entityId, currentUrl, onUploadSuccess, folder = 'general', appLang = 'vi', allowMultiple = false }) => {
    const [uploading, setUploading] = useState(false);
    const [previewUrls, setPreviewUrls] = useState(allowMultiple ? (currentUrl ? currentUrl.split(',').filter(u => u) : []) : (currentUrl ? [currentUrl] : []));
    const fileInputRef = useRef(null);

    const labels = {
        vi: { upload: 'Tải ảnh/video', change: 'Thay đổi', uploading: 'Đang tải...', error: 'Lỗi tải lên', success: 'Thành công', remove: 'Xóa' },
        en: { upload: 'Upload Media', change: 'Change', uploading: 'Uploading...', error: 'Upload error', success: 'Success', remove: 'Remove' },
        ede: { upload: 'Čih ảnh/video', change: 'Mlih', uploading: 'Dữ...', error: 'Lỗi', success: 'KLă', remove: 'Xóa' }
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
            const fileName = `${entityType}_${entityId}_${Math.random().toString(36).substring(2)}.${fileExt}`;

            // Upload to PocketBase via a temporary approach:
            // Store file as a data URL for preview, pass the File object for later record update
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;

                let newUrls = [];
                if (allowMultiple) {
                    newUrls = [...previewUrls, dataUrl];
                } else {
                    newUrls = [dataUrl];
                }

                setPreviewUrls(newUrls);

                // Store the file object for the parent component to use when saving
                if (onUploadSuccess) {
                    onUploadSuccess(allowMultiple ? newUrls.join(',') : dataUrl, file);
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            alert(`${t.error}: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (e, urlToRemove) => {
        e.stopPropagation();
        const newUrls = previewUrls.filter(url => url !== urlToRemove);
        setPreviewUrls(newUrls);
        if (onUploadSuccess) {
            onUploadSuccess(allowMultiple ? newUrls.join(',') : (newUrls[0] || ''), null);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    const isVideo = (url) => url && (url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.webm') || url.includes('video/'));

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

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {previewUrls.map((url, index) => (
                    <div key={index} className="media-preview-box" style={{
                        width: allowMultiple ? '100px' : '100%',
                        height: allowMultiple ? '100px' : '200px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        background: '#f8fafc',
                        position: 'relative'
                    }}>
                        {isVideo(url) ? (
                            <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                        ) : (
                            <img src={url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                        {!uploading && (
                            <div onClick={(e) => handleRemove(e, url)} style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                background: 'rgba(255,255,255,0.8)',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#ef4444'
                            }}>
                                <i className="fas fa-times"></i>
                            </div>
                        )}
                    </div>
                ))}

                {(allowMultiple || previewUrls.length === 0) && (
                    <div className="media-add-box" style={{
                        width: allowMultiple ? '100px' : '100%',
                        height: allowMultiple ? '100px' : '200px',
                        border: '2px dashed #cbd5e1',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f1f5f9',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }} onClick={triggerFileInput}>
                        {uploading ? (
                            <div className="spinner" style={{ border: '3px solid #f3f3f3', borderTop: '3px solid #3498db', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 1s linear infinite' }}></div>
                        ) : (
                            <>
                                <i className="fas fa-plus" style={{ fontSize: '20px', color: '#64748b' }}></i>
                                {!allowMultiple && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>{t.upload}</div>}
                            </>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .media-add-box:hover {
                    border-color: #3b82f6;
                    background: #eff6ff;
                }
            `}</style>
        </div>
    );
};

export default MediaUpload;
