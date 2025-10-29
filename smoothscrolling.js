        (function () {
            'use strict';

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }

            function init() {
                // Configuration
                const config = {
                    smoothFactor: 0.07,        // Lower = smoother/slower (0.01-0.15)
                    touchSensitivity: 0.2,     // Touch scroll multiplier (reduced for mobile)
                    inertiaMultiplier: 5,     // Momentum after touch release (reduced)
                    inertiaDecay: 0.8         // Velocity decay rate (0-1, faster decay)
                };

                // Create wrapper structure
                const body = document.body;
                const originalContent = Array.from(body.children);

                // Create container and scroller divs
                const container = document.createElement('div');
                const scroller = document.createElement('div');

                container.className = 'smooth-scroll-container';
                scroller.className = 'smooth-scroll-scroller';

                // Move all body content into scroller
                originalContent.forEach(child => scroller.appendChild(child));
                container.appendChild(scroller);
                body.appendChild(container);

                // Add required styles
                const style = document.createElement('style');
                style.textContent = `
      body { overflow: hidden !important; }
      .smooth-scroll-container { 
        position: relative; 
        height: 100vh; 
        overflow: hidden; 
      }
      .smooth-scroll-scroller { 
        position: absolute; 
        left: 0; 
        top: 0; 
        width: 100%; 
        will-change: transform;
        transform: translateZ(0);
      }
    `;
                document.head.appendChild(style);

                // State variables
                let targetY = 0;
                let currentY = 0;
                let maxScroll = 0;

                // Helper functions
                const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
                const lerp = (a, b, factor) => a + (b - a) * factor;
                const round2 = v => Math.round(v * 100) / 100;

                function updateBounds() {
                    maxScroll = Math.max(0, scroller.scrollHeight - window.innerHeight);
                    targetY = clamp(targetY, 0, maxScroll);
                    currentY = clamp(currentY, 0, maxScroll);
                }

                // Initialize
                updateBounds();

                // Animation loop
                function animate() {
                    currentY = lerp(currentY, targetY, config.smoothFactor);
                    scroller.style.transform = `translate3d(0, -${round2(currentY)}px, 0)`;
                    requestAnimationFrame(animate);
                }
                requestAnimationFrame(animate);

                // Mouse wheel handler
                let wheelTimeout;
                function onWheel(e) {
                    e.preventDefault();
                    targetY += e.deltaY;
                    targetY = clamp(targetY, 0, maxScroll);

                    clearTimeout(wheelTimeout);
                    wheelTimeout = setTimeout(() => {
                        // Reserved for additional logic (snap points, etc.)
                    }, 60);
                }

                // Touch handlers
                let isTouchDown = false;
                let lastTouchY = 0;
                let touchVelocity = 0;
                let lastTouchTime = 0;

                function onTouchStart(e) {
                    isTouchDown = true;
                    lastTouchY = e.touches[0].clientY;
                    lastTouchTime = performance.now();
                    touchVelocity = 0;
                }

                function onTouchMove(e) {
                    if (!isTouchDown) return;
                    e.preventDefault();

                    const y = e.touches[0].clientY;
                    const delta = lastTouchY - y;
                    const now = performance.now();
                    const dt = now - lastTouchTime || 16;

                    touchVelocity = delta / dt * 16;
                    lastTouchY = y;
                    lastTouchTime = now;

                    targetY += delta * config.touchSensitivity;
                    targetY = clamp(targetY, 0, maxScroll);
                }

                function onTouchEnd() {
                    isTouchDown = false;

                    // Apply inertia
                    if (Math.abs(touchVelocity) > 0.2) {
                        let velocity = touchVelocity * config.inertiaMultiplier;

                        const applyInertia = () => {
                            velocity *= config.inertiaDecay;
                            targetY += velocity;
                            targetY = clamp(targetY, 0, maxScroll);

                            if (Math.abs(velocity) > 0.5) {
                                requestAnimationFrame(applyInertia);
                            }
                        };

                        requestAnimationFrame(applyInertia);
                    }
                }

                // Event listeners
                window.addEventListener('resize', updateBounds);
                container.addEventListener('wheel', onWheel, { passive: false });
                container.addEventListener('touchstart', onTouchStart, { passive: true });
                container.addEventListener('touchmove', onTouchMove, { passive: false });
                container.addEventListener('touchend', onTouchEnd, { passive: true });

                // Expose API for external control (optional)
                window.SmoothScroll = {
                    scrollTo: (y) => {
                        targetY = clamp(y, 0, maxScroll);
                    },
                    getPosition: () => currentY,
                    updateBounds: updateBounds,
                    setConfig: (newConfig) => {
                        Object.assign(config, newConfig);
                    }
                };
            }
        })();
