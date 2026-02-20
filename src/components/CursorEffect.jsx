import { useEffect, useRef } from 'react';

/**
 * CursorEffect — Adds a premium glowing cursor trail + magnetic hover effect.
 * Renders a soft gradient orb that follows the mouse with a smooth delay.
 * On interactive elements (buttons, links, cards), the orb scales up.
 */
function CursorEffect() {
    const cursorRef = useRef(null);
    const cursorDotRef = useRef(null);
    const posRef = useRef({ x: -100, y: -100 });
    const targetRef = useRef({ x: -100, y: -100 });
    const rafRef = useRef(null);
    const isHoveringRef = useRef(false);
    const isClickingRef = useRef(false);
    const visibleRef = useRef(false);

    useEffect(() => {
        const cursor = cursorRef.current;
        const dot = cursorDotRef.current;
        if (!cursor || !dot) return;

        // Detect touch devices — disable custom cursor
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) {
            cursor.style.display = 'none';
            dot.style.display = 'none';
            return;
        }

        const INTERACTIVE_SELECTORS = 'a, button, input, textarea, select, [role="button"], .card-hover, .nav-item, .folder-card, .btn, .btn-icon, .toggle-switch, .user-menu-trigger, .dropdown-item';

        const handleMouseMove = (e) => {
            targetRef.current = { x: e.clientX, y: e.clientY };

            // Immediately position the dot (no lag)
            dot.style.left = `${e.clientX}px`;
            dot.style.top = `${e.clientY}px`;

            if (!visibleRef.current) {
                visibleRef.current = true;
                cursor.style.opacity = '1';
                dot.style.opacity = '1';
            }
        };

        const handleMouseEnterInteractive = () => {
            isHoveringRef.current = true;
            cursor.classList.add('cursor-hover');
            dot.classList.add('cursor-dot-hover');
        };

        const handleMouseLeaveInteractive = () => {
            isHoveringRef.current = false;
            cursor.classList.remove('cursor-hover');
            dot.classList.remove('cursor-dot-hover');
        };

        const handleMouseDown = () => {
            isClickingRef.current = true;
            cursor.classList.add('cursor-click');
            dot.classList.add('cursor-dot-click');
        };

        const handleMouseUp = () => {
            isClickingRef.current = false;
            cursor.classList.remove('cursor-click');
            dot.classList.remove('cursor-dot-click');
        };

        const handleMouseLeave = () => {
            visibleRef.current = false;
            cursor.style.opacity = '0';
            dot.style.opacity = '0';
        };

        const handleMouseEnter = () => {
            visibleRef.current = true;
            cursor.style.opacity = '1';
            dot.style.opacity = '1';
        };

        // Smooth animation loop — cursor orb lags behind with easing
        const animate = () => {
            const lerp = 0.15;
            posRef.current.x += (targetRef.current.x - posRef.current.x) * lerp;
            posRef.current.y += (targetRef.current.y - posRef.current.y) * lerp;

            cursor.style.left = `${posRef.current.x}px`;
            cursor.style.top = `${posRef.current.y}px`;

            rafRef.current = requestAnimationFrame(animate);
        };

        // Attach interactive element listeners
        const attachInteractiveListeners = () => {
            const interactiveElements = document.querySelectorAll(INTERACTIVE_SELECTORS);
            interactiveElements.forEach(el => {
                el.addEventListener('mouseenter', handleMouseEnterInteractive);
                el.addEventListener('mouseleave', handleMouseLeaveInteractive);
            });
            return interactiveElements;
        };

        // Initial attachment
        let interactiveElements = attachInteractiveListeners();

        // Observer to re-attach on DOM changes (React re-renders)
        const observer = new MutationObserver(() => {
            // Detach old
            interactiveElements.forEach(el => {
                el.removeEventListener('mouseenter', handleMouseEnterInteractive);
                el.removeEventListener('mouseleave', handleMouseLeaveInteractive);
            });
            // Re-attach
            interactiveElements = attachInteractiveListeners();
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Global listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mouseup', handleMouseUp);
        document.documentElement.addEventListener('mouseleave', handleMouseLeave);
        document.documentElement.addEventListener('mouseenter', handleMouseEnter);

        // Start animation loop
        rafRef.current = requestAnimationFrame(animate);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mouseup', handleMouseUp);
            document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
            document.documentElement.removeEventListener('mouseenter', handleMouseEnter);

            interactiveElements.forEach(el => {
                el.removeEventListener('mouseenter', handleMouseEnterInteractive);
                el.removeEventListener('mouseleave', handleMouseLeaveInteractive);
            });

            observer.disconnect();

            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    return (
        <>
            {/* Glow orb — follows cursor with smooth delay */}
            <div ref={cursorRef} className="cursor-glow" />
            {/* Dot — snaps to cursor position instantly */}
            <div ref={cursorDotRef} className="cursor-dot" />
        </>
    );
}

export default CursorEffect;
