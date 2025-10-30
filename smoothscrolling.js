/**
 * Universal Smooth Scroll v1.0
 * A standalone smooth scrolling solution that preserves fixed/sticky elements
 * Works with any HTML page without breaking existing functionality
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Configuration - easily adjustable
    const config = {
      smoothFactor: 0.08,          // Lower = smoother (0.01-0.15)
      touchSensitivity: 0.3,       // Touch scroll multiplier
      inertiaMultiplier: 4,        // Momentum after touch release
      inertiaDecay: 0.85,          // Velocity decay rate (0-1)
      excludeSelectors: [          // Elements to exclude from wrapping
        '#scrollToTop',
        '#bottomBlur',
        '[data-smooth-scroll-exclude]'
      ]
    };

    const body = document.body;
    const html = document.documentElement;

    // Get all children except excluded elements
    const allChildren = Array.from(body.children);
    const excludedElements = [];
    const contentElements = [];

    allChildren.forEach(child => {
      const isExcluded = config.excludeSelectors.some(selector => 
        child.matches(selector)
      );
      
      if (isExcluded) {
        excludedElements.push(child);
      } else {
        contentElements.push(child);
      }
    });

    // Only proceed if we have content to wrap
    if (contentElements.length === 0) return;

    // Create wrapper structure
    const container = document.createElement('div');
    const scroller = document.createElement('div');

    container.className = 'ss-container';
    scroller.className = 'ss-scroller';

    // Move content into scroller
    contentElements.forEach(child => scroller.appendChild(child));
    
    // Add scroller to container
    container.appendChild(scroller);
    
    // Add container to body (excluded elements remain as direct children)
    body.insertBefore(container, body.firstChild);

    // Add required styles
    const style = document.createElement('style');
    style.id = 'smooth-scroll-styles';
    style.textContent = `
      html { 
        overflow: hidden !important; 
      }
      body { 
        overflow: hidden !important;
        margin: 0;
        padding: 0;
      }
      .ss-container { 
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        overflow: hidden;
        z-index: 0;
      }
      .ss-scroller { 
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        will-change: transform;
        transform: translateZ(0);
      }
      /* Ensure fixed elements stay on top */
      body > *:not(.ss-container) {
        position: fixed;
        z-index: 1000;
      }
    `;
    document.head.appendChild(style);

    // State variables
    let targetY = 0;
    let currentY = 0;
    let maxScroll = 0;
    let rafId = null;

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
      const diff = Math.abs(targetY - currentY);
      
      // Only animate if there's a meaningful difference
      if (diff > 0.5) {
        currentY = lerp(currentY, targetY, config.smoothFactor);
        scroller.style.transform = `translate3d(0, -${round2(currentY)}px, 0)`;
        rafId = requestAnimationFrame(animate);
      } else {
        currentY = targetY;
        scroller.style.transform = `translate3d(0, -${round2(currentY)}px, 0)`;
        rafId = null;
      }
      
      // Update scroll position for scroll event listeners
      updateScrollPosition();
    }

    function startAnimation() {
      if (!rafId) {
        rafId = requestAnimationFrame(animate);
      }
    }

    // Dispatch custom scroll events for compatibility
    let lastScrollY = 0;
    function updateScrollPosition() {
      if (Math.abs(currentY - lastScrollY) > 1) {
        lastScrollY = currentY;
        
        // Dispatch scroll event
        window.dispatchEvent(new CustomEvent('scroll', {
          detail: { scrollY: currentY }
        }));
        
        // Update window.pageYOffset for compatibility
        Object.defineProperty(window, 'pageYOffset', {
          get: () => currentY,
          configurable: true
        });
        Object.defineProperty(window, 'scrollY', {
          get: () => currentY,
          configurable: true
        });
      }
    }

    // Mouse wheel handler
    function onWheel(e) {
      e.preventDefault();
      targetY += e.deltaY;
      targetY = clamp(targetY, 0, maxScroll);
      startAnimation();
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
      
      const y = e.touches[0].clientY;
      const delta = lastTouchY - y;
      const now = performance.now();
      const dt = now - lastTouchTime || 16;

      touchVelocity = delta / dt * 16;
      lastTouchY = y;
      lastTouchTime = now;

      targetY += delta * config.touchSensitivity;
      targetY = clamp(targetY, 0, maxScroll);
      startAnimation();
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
          startAnimation();

          if (Math.abs(velocity) > 0.5) {
            requestAnimationFrame(applyInertia);
          }
        };

        requestAnimationFrame(applyInertia);
      }
    }

    // Keyboard navigation
    function onKeyDown(e) {
      const step = window.innerHeight * 0.8;
      
      switch(e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          targetY = clamp(targetY + step, 0, maxScroll);
          startAnimation();
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          targetY = clamp(targetY - step, 0, maxScroll);
          startAnimation();
          break;
        case 'Home':
          e.preventDefault();
          targetY = 0;
          startAnimation();
          break;
        case 'End':
          e.preventDefault();
          targetY = maxScroll;
          startAnimation();
          break;
        case ' ':
          e.preventDefault();
          targetY = clamp(
            targetY + (e.shiftKey ? -step : step), 
            0, 
            maxScroll
          );
          startAnimation();
          break;
      }
    }

    // Event listeners
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateBounds, 100);
    });
    
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    // Override window.scrollTo for compatibility
    const originalScrollTo = window.scrollTo;
    window.scrollTo = function(x, y) {
      if (typeof x === 'object') {
        targetY = clamp(x.top || x.y || 0, 0, maxScroll);
        if (x.behavior === 'smooth') {
          startAnimation();
        } else {
          currentY = targetY;
          scroller.style.transform = `translate3d(0, -${round2(currentY)}px, 0)`;
        }
      } else {
        targetY = clamp(y, 0, maxScroll);
        startAnimation();
      }
    };

    // Public API
    window.SmoothScroll = {
      scrollTo: (y, smooth = true) => {
        targetY = clamp(y, 0, maxScroll);
        if (smooth) {
          startAnimation();
        } else {
          currentY = targetY;
          scroller.style.transform = `translate3d(0, -${round2(currentY)}px, 0)`;
        }
      },
      getPosition: () => currentY,
      getMaxScroll: () => maxScroll,
      updateBounds: updateBounds,
      setConfig: (newConfig) => {
        Object.assign(config, newConfig);
      },
      destroy: () => {
        // Remove event listeners
        container.removeEventListener('wheel', onWheel);
        container.removeEventListener('touchstart', onTouchStart);
        container.removeEventListener('touchmove', onTouchMove);
        container.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('keydown', onKeyDown);
        
        // Restore original structure
        contentElements.forEach(child => body.appendChild(child));
        container.remove();
        document.getElementById('smooth-scroll-styles')?.remove();
        
        // Restore scrollTo
        window.scrollTo = originalScrollTo;
        
        // Clean up
        if (rafId) cancelAnimationFrame(rafId);
      }
    };

    // Initialize first frame
    startAnimation();
  }
})();