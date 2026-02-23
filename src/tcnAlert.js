/**
 * Custom alert/confirm dialogs with "Tân Cao Nguyên says:" title
 * Overrides window.alert and window.confirm globally
 */

const TCN_TITLE = 'Tân Cao Nguyên says:';

function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'tcn-alert-overlay';
    Object.assign(overlay.style, {
        position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: '99999', animation: 'tcnFadeIn 0.15s ease'
    });
    return overlay;
}

function createDialog(message, isConfirm = false) {
    const dialog = document.createElement('div');
    dialog.className = 'tcn-alert-dialog';
    Object.assign(dialog.style, {
        background: 'white', borderRadius: '20px', padding: '0',
        width: '92%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden', animation: 'tcnSlideUp 0.2s ease'
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
        background: 'linear-gradient(135deg, #5D4037, #8D6E63)',
        padding: '16px 20px', color: 'white', fontWeight: '700',
        fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px'
    });
    header.innerHTML = `<span style="font-size:18px">☕</span> ${TCN_TITLE}`;

    // Body
    const body = document.createElement('div');
    Object.assign(body.style, {
        padding: '20px 24px', fontSize: '14px', color: '#334155',
        lineHeight: '1.6', wordBreak: 'break-word'
    });
    body.textContent = message;

    // Footer
    const footer = document.createElement('div');
    Object.assign(footer.style, {
        padding: '12px 20px 16px', display: 'flex', justifyContent: 'flex-end',
        gap: '10px', borderTop: '1px solid #f1f5f9'
    });

    const btnStyle = {
        padding: '8px 24px', borderRadius: '10px', fontWeight: '700',
        fontSize: '13px', cursor: 'pointer', border: 'none', transition: 'all 0.15s'
    };

    const okBtn = document.createElement('button');
    Object.assign(okBtn.style, { ...btnStyle, background: '#5D4037', color: 'white' });
    okBtn.textContent = 'OK';
    okBtn.onmouseenter = () => okBtn.style.background = '#4E342E';
    okBtn.onmouseleave = () => okBtn.style.background = '#5D4037';

    if (isConfirm) {
        const cancelBtn = document.createElement('button');
        Object.assign(cancelBtn.style, { ...btnStyle, background: '#f1f5f9', color: '#475569' });
        cancelBtn.textContent = 'Hủy';
        cancelBtn.onmouseenter = () => cancelBtn.style.background = '#e2e8f0';
        cancelBtn.onmouseleave = () => cancelBtn.style.background = '#f1f5f9';
        footer.appendChild(cancelBtn);
        dialog.cancelBtn = cancelBtn;
    }

    footer.appendChild(okBtn);
    dialog.okBtn = okBtn;

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    return dialog;
}

// Inject animation CSS once
const style = document.createElement('style');
style.textContent = `
@keyframes tcnFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes tcnSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
`;
document.head.appendChild(style);

// Store originals
const _nativeAlert = window.alert.bind(window);
const _nativeConfirm = window.confirm.bind(window);

// Override alert
window.alert = function (message) {
    return new Promise(resolve => {
        const overlay = createOverlay();
        const dialog = createDialog(String(message), false);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const close = () => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                resolve();
            }, 120);
        };

        dialog.okBtn.onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };
        dialog.okBtn.focus();
    });
};

// Override confirm
window.confirm = function (message) {
    // confirm must be synchronous for existing code, so we use a sync approach
    // Since true sync isn't possible with custom UI, we override with a blocking approach
    // For components using `if (!confirm(...)) return;` pattern, this needs special handling

    // Create and show the dialog
    let result = false;
    const overlay = createOverlay();
    const dialog = createDialog(String(message), true);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Use a synchronous-like pattern with event loop blocking
    // Unfortunately, true sync confirm replacement isn't possible in modern browsers
    // So we'll use the native confirm as fallback with the message prefixed
    overlay.remove();
    return _nativeConfirm(`☕ ${TCN_TITLE}\n\n${message}`);
};

export default { _nativeAlert, _nativeConfirm };
