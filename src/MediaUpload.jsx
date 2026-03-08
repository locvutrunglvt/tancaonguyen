import React, { useState, useRef } from 'react';
import pb from './pbClient';

/**
 * Get file URL from a PocketBase record's file field
 */
export const getFileUrl = (record, filename) => {
    if (!record || !filename) return null;
    return pb.files.getUrl(record, filename);
};

/**
 * Upload file(s) to a PocketBase record's file field after create/update
 */
export const uploadFileToPB = async (collectionName, recordId, fieldName, files) => {
    if (!files || !recordId) return;
    const fd = new FormData();
    if (Array.isArray(files)) {
        files.forEach(f => { if (f) fd.append(fieldName, f); });
    } else {
        fd.append(fieldName, files);
    }
    await pb.collection(collectionName).update(recordId, fd);
};

const ACCEPT_ALL = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

const MediaUpload = ({ entityType, entityId, currentUrl, onUploadSuccess, folder = 'general', appLang = 'vi', allowMultiple = true }) => {
    const [uploading, setUploading] = useState(false);
    const [previewUrls, setPreviewUrls] = useState(
        currentUrl ? currentUrl.split(',').filter(u => u) : []
    );
    const [fileNames, setFileNames] = useState([]);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const labels = {
        vi: { upload: 'Tải ảnh/video/tài liệu', camera: 'Chụp ảnh', file: 'Chọn tệp', uploading: 'Đang tải...', error: 'Lỗi tải lên', success: 'Thành công', remove: 'Xóa' },
        en: { upload: 'Upload media/docs', camera: 'Take photo', file: 'Choose files', uploading: 'Uploading...', error: 'Upload error', success: 'Success', remove: 'Remove' },
        ede: { upload: 'Čih ảnh/video/tài liệu', camera: 'Mă rup', file: 'Hriêng tệp', uploading: 'Dữ...', error: 'Lỗi', success: 'Klă', remove: 'Xóa' }
    };
    const t = labels[appLang] || labels.vi;

    const isVideo = (url, name) => {
        const s = (url || name || '').toLowerCase();
        return s.endsWith('.mp4') || s.endsWith('.mov') || s.endsWith('.webm') || s.endsWith('.avi') || s.includes('video/');
    };

    const isDoc = (url, name) => {
        const s = (url || name || '').toLowerCase();
        return s.endsWith('.pdf') || s.endsWith('.doc') || s.endsWith('.docx')
            || s.endsWith('.xls') || s.endsWith('.xlsx') || s.endsWith('.ppt') || s.endsWith('.pptx')
            || s.endsWith('.txt') || s.endsWith('.csv');
    };

    const getDocIcon = (name) => {
        const s = (name || '').toLowerCase();
        if (s.endsWith('.pdf')) return 'fas fa-file-pdf';
        if (s.endsWith('.doc') || s.endsWith('.docx')) return 'fas fa-file-word';
        if (s.endsWith('.xls') || s.endsWith('.xlsx')) return 'fas fa-file-excel';
        if (s.endsWith('.ppt') || s.endsWith('.pptx')) return 'fas fa-file-powerpoint';
        if (s.endsWith('.csv')) return 'fas fa-file-csv';
        return 'fas fa-file-alt';
    };

    const processFiles = (files) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const fileList = Array.from(files);
            let processed = 0;
            const newUrls = [...previewUrls];
            const newNames = [...fileNames];

            fileList.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    newUrls.push(e.target.result);
                    newNames.push(file.name);
                    processed++;
                    if (processed === fileList.length) {
                        setPreviewUrls([...newUrls]);
                        setFileNames([...newNames]);
                        if (onUploadSuccess) {
                            onUploadSuccess(newUrls.join(','), fileList.length === 1 ? fileList[0] : fileList);
                        }
                        setUploading(false);
                    }
                };
                reader.readAsDataURL(file);
            });
        } catch (error) {
            alert(`${t.error}: ${error.message}`);
            setUploading(false);
        }
    };

    const handleFileChange = (event) => {
        processFiles(event.target.files);
        event.target.value = '';
    };

    const handleRemove = (e, index) => {
        e.stopPropagation();
        const newUrls = previewUrls.filter((_, i) => i !== index);
        const newNames = fileNames.filter((_, i) => i !== index);
        setPreviewUrls(newUrls);
        setFileNames(newNames);
        if (onUploadSuccess) {
            onUploadSuccess(newUrls.join(','), null);
        }
    };

    const boxSize = 90;

    return (
        <div className="media-upload-container" style={{ margin: '8px 0' }}>
            <input type="file" accept={ACCEPT_ALL} onChange={handleFileChange} disabled={uploading}
                ref={fileInputRef} style={{ display: 'none' }} multiple={allowMultiple} />
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange}
                disabled={uploading} ref={cameraInputRef} style={{ display: 'none' }} />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-start' }}>
                {previewUrls.map((url, index) => {
                    const name = fileNames[index] || '';
                    const docFile = isDoc(url, name);
                    const videoFile = isVideo(url, name);
                    return (
                        <div key={index} style={{
                            width: `${boxSize}px`, height: `${boxSize}px`,
                            border: '1px solid #e2e8f0', borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', background: '#f8fafc', position: 'relative', flexShrink: 0,
                        }}>
                            {docFile ? (
                                <div style={{ textAlign: 'center', padding: '6px' }}>
                                    <i className={getDocIcon(name)} style={{ fontSize: '24px', color: '#6366f1' }}></i>
                                    <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px', wordBreak: 'break-all', lineHeight: 1.2 }}>
                                        {name.length > 16 ? name.slice(0, 14) + '...' : name}
                                    </div>
                                </div>
                            ) : videoFile ? (
                                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                    <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                    <i className="fas fa-play-circle" style={{
                                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                        fontSize: '22px', color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                                    }}></i>
                                </div>
                            ) : (
                                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                            {!uploading && (
                                <div onClick={(e) => handleRemove(e, index)} style={{
                                    position: 'absolute', top: '3px', right: '3px',
                                    background: 'rgba(255,255,255,0.85)', width: '20px', height: '20px',
                                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: '#ef4444', fontSize: '11px',
                                }}>
                                    <i className="fas fa-times"></i>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Add buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div onClick={() => fileInputRef.current.click()} style={{
                        width: `${boxSize}px`, height: `${Math.floor(boxSize / 2) - 2}px`,
                        border: '2px dashed #cbd5e1', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        background: '#f1f5f9', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f1f5f9'; }}
                    >
                        {uploading ? (
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '14px', color: '#3b82f6' }}></i>
                        ) : (
                            <>
                                <i className="fas fa-paperclip" style={{ fontSize: '13px', color: '#64748b' }}></i>
                                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{t.file}</span>
                            </>
                        )}
                    </div>
                    <div onClick={() => cameraInputRef.current.click()} style={{
                        width: `${boxSize}px`, height: `${Math.floor(boxSize / 2) - 2}px`,
                        border: '2px dashed #cbd5e1', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        background: '#f1f5f9', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = '#ecfdf5'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f1f5f9'; }}
                    >
                        <i className="fas fa-camera" style={{ fontSize: '13px', color: '#64748b' }}></i>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{t.camera}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaUpload;
