import React, { useState, useEffect } from 'react';

const PwaInstallBanner = ({ appLang = 'vi' }) => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            setIsInstalled(true);
            return;
        }

        // Check if user dismissed recently
        const dismissed = localStorage.getItem('pwa_banner_dismissed');
        if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
            return; // Don't show for 7 days after dismiss
        }

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // iOS Safari detection - show manual install guide
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isIOS && isSafari && !window.navigator.standalone) {
            setTimeout(() => setShowBanner(true), 2000);
        }

        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowBanner(false);
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            if (result.outcome === 'accepted') {
                setShowBanner(false);
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
    };

    if (!showBanner || isInstalled) return null;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    const texts = {
        vi: {
            title: 'Cai dat ung dung TCN',
            desc: deferredPrompt
                ? 'Them TCN vao man hinh chinh de truy cap nhanh hon!'
                : 'Nhan Share > "Them vao Man hinh chinh" de cai dat.',
            install: 'Cai dat',
            later: 'De sau'
        },
        en: {
            title: 'Install TCN App',
            desc: deferredPrompt
                ? 'Add TCN to your home screen for quick access!'
                : 'Tap Share > "Add to Home Screen" to install.',
            install: 'Install',
            later: 'Later'
        },
        ede: {
            title: 'Dung TCN App',
            desc: 'Dung TCN app kơ layar.',
            install: 'Dung',
            later: 'Hơ'
        }
    };

    const txt = texts[appLang] || texts.vi;

    return (
        <div style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: '420px',
            background: 'linear-gradient(135deg, #4B3621, #6D4C41)',
            color: 'white',
            borderRadius: '20px',
            padding: '18px 20px',
            zIndex: 9999,
            boxShadow: '0 12px 40px rgba(75, 54, 33, 0.4)',
            animation: 'slideUpBanner 0.4s ease-out'
        }}>
            <style>{`
                @keyframes slideUpBanner {
                    from { opacity: 0; transform: translateX(-50%) translateY(30px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.15)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: '22px'
                }}>
                    <i className={isIOS ? 'fas fa-share-square' : 'fas fa-download'}></i>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{txt.title}</div>
                    <div style={{ fontSize: '12px', opacity: 0.85, lineHeight: '1.4' }}>{txt.desc}</div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                {deferredPrompt && (
                    <button onClick={handleInstall} style={{
                        flex: 1, padding: '10px', border: 'none', borderRadius: '12px',
                        background: '#D4AF37', color: '#3E2723', fontWeight: 700,
                        fontSize: '14px', cursor: 'pointer'
                    }}>
                        <i className="fas fa-download" style={{ marginRight: '6px' }}></i>{txt.install}
                    </button>
                )}
                <button onClick={handleDismiss} style={{
                    flex: deferredPrompt ? 0 : 1, padding: '10px 16px', border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '12px', background: 'transparent', color: 'white',
                    fontWeight: 600, fontSize: '13px', cursor: 'pointer'
                }}>
                    {txt.later}
                </button>
            </div>
        </div>
    );
};

export default PwaInstallBanner;
