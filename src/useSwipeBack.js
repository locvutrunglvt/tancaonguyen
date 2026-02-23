import { useEffect, useRef } from 'react';

/**
 * Swipe right from left edge → triggers onBack callback
 * Prevents the default "exit app" behavior in PWA/mobile
 */
const useSwipeBack = (onBack, enabled = true) => {
    const touchRef = useRef({ startX: 0, startY: 0, startTime: 0 });

    useEffect(() => {
        if (!enabled) return;

        const handleTouchStart = (e) => {
            const touch = e.touches[0];
            touchRef.current = {
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now()
            };
        };

        const handleTouchEnd = (e) => {
            const touch = e.changedTouches[0];
            const { startX, startY, startTime } = touchRef.current;
            const dx = touch.clientX - startX;
            const dy = Math.abs(touch.clientY - startY);
            const dt = Date.now() - startTime;

            // Swipe right: must start from left 40px edge, >80px horizontal, <60px vertical, <400ms
            if (startX < 40 && dx > 80 && dy < 60 && dt < 400) {
                e.preventDefault();
                onBack();
            }
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [onBack, enabled]);
};

export default useSwipeBack;
