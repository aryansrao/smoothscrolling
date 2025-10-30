/**
 * Universal Smooth Scroll v2.0
 * A truly universal smooth scrolling solution that works on ANY page
 * Preserves all fixed/sticky elements and existing scroll event listeners
 */

(function () {
  'use strict';

  // Configuration - easily adjustable
  const config = {
    smoothFactor: 0.08,          // Lower = smoother (0.01-0.15)
    touchSensitivity: 0.3,       // Touch scroll multiplier
    inertiaMultiplier: 4,        // Momentum after touch release
    inertiaDecay: 0.85,          // Velocity decay rate (0-1)
    autoExcludeFixed: true,      // Automatically exclude fixed/sticky elements
    excludeSelectors: [          // Additional elements to exclude
      '[data-smooth-scroll-exclude]'
    ]
  };

  // Wait for DOM to be fully loaded
  function init() {
    const body = document.body;
    const html = document.documentElement;

    // Find all elements that should be excluded
    function shouldExclude(element) {
      // Check custom exclude selectors
      const matchesCustomSelector = config.excludeSelectors.some(selector =>
        element.matches && element.matches(selector)
      );
      if (matchesCustomSelector) return true;

      // Auto-detect fixed/sticky positioned elements
      if (config.autoExcludeFixed) {
        const style = window.getComputedStyle(element);
        const position = style.position;
        if (position === 'fixed' || position === 'sticky') return true;
      }

      return false;
    }

    // Separate content and fixed elements
    const allChildren = Array.from(body.children);
    const excludedElements = [];
    const contentElements = [];

    allChildren.forEach(child => {
      if (shouldExclude(child)) {
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
    container.setAttribute('data-smooth-scroll', 'true');

    // Move content into scroller
    contentElements.forEach(child => scroller.appendChild(child));
    container.appendChild(scroller);

    // Insert container as first child (fixed elements stay after)
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
      /* Ensure excluded elements maintain their positioning */
      body > *:not(.ss-container) {
        z-index: 1000;
      }
    `;
    document.head.appendChild(style);

    // State variables
    let targetY = 0;
    let currentY = 0;
    let maxScroll = 0;
    let rafId = null;
    let isAnimating = false;

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

    // Dispatch scroll events for compatibility with existing listeners
    function dispatchScrollEvent() {
      // Create and dispatch scroll event
      const scrollEvent = new Event('scroll', { bubbles: true });
      window.dispatchEvent(scrollEvent);

      // Update window scroll properties for compatibility
      try {
        Object.defineProperty(window, 'pageYOffset', {
          get: () => currentY,
          configurable: true
        });
        Object.defineProperty(window, 'scrollY', {
          get: () => currentY,
          configurable: true
        });
        Object.defineProperty(window, 'pageXOffset', {
          get: () => 0,
          configurable: true
        });
        Object.defineProperty(window, 'scrollX', {
          get: () => 0,
          configurable: true
        });
      } catch (e) {
        // Properties might already be defined
      }
    }

    // Animation loop
    let lastDispatchY = 0;
    function animate() {
      const diff = Math.abs(targetY - currentY);

      if (diff > 0.5) {
        currentY = lerp(currentY, targetY, config.smoothFactor);
        scroller.style.transform = `translate3d(0, -${round2(currentY)}px, 0)`;

        // Dispatch scroll event if position changed significantly
        if (Math.abs(currentY - lastDispatchY) > 1) {
          dispatchScrollEvent();
          lastDispatchY = currentY;
        }

        rafId = requestAnimationFrame(animate);
        isAnimating = true;
      } else {
        currentY = targetY;
        scroller.style.transform = `translate3d(0, -${round2(currentY)}px, 0)`;

        // Final scroll event dispatch
        if (Math.abs(currentY - lastDispatchY) > 0) {
          dispatchScrollEvent();
          lastDispatchY = currentY;
        }

        rafId = null;
        isAnimating = false;
      }
    }

    function startAnimation() {
      if (!rafId) {
        rafId = requestAnimationFrame(animate);
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
      // Don't intercept if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const step = window.innerHeight * 0.8;
      let handled = false;

      switch (e.key) {
        case 'ArrowDown':
          targetY = clamp(targetY + 40, 0, maxScroll);
          handled = true;
          break;
        case 'ArrowUp':
          targetY = clamp(targetY - 40, 0, maxScroll);
          handled = true;
          break;
        case 'PageDown':
          targetY = clamp(targetY + step, 0, maxScroll);
          handled = true;
          break;
        case 'PageUp':
          targetY = clamp(targetY - step, 0, maxScroll);
          handled = true;
          break;
        case 'Home':
          targetY = 0;
          handled = true;
          break;
        case 'End':
          targetY = maxScroll;
          handled = true;
          break;
        case ' ':
          targetY = clamp(
            targetY + (e.shiftKey ? -step : step),
            0,
            maxScroll
          );
          handled = true;
          break;
      }

      if (handled) {
        e.preventDefault();
        startAnimation();
      }
    }

    // Event listeners
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        updateBounds();
        dispatchScrollEvent();
      }, 100);
    });

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    // Override window.scrollTo for compatibility
    const originalScrollTo = window.scrollTo;
    window.scrollTo = function (x, y) {
      if (typeof x === 'object') {
        const options = x;
        targetY = clamp(options.top || options.y || 0, 0, maxScroll);
        if (options.behavior === 'smooth') {
          startAnimation();
        } else {
          currentY = targetY;
          scroller.style.transform = `translate3d(0, -${round2(currentY)}px, 0)`;
          dispatchScrollEvent();
        }
      } else {
        targetY = clamp(typeof y === 'number' ? y : 0, 0, maxScroll);
        startAnimation();
      }
    };

    // Override scrollBy
    window.scrollBy = function (x, y) {
      if (typeof x === 'object') {
        const deltaY = x.top || x.y || 0;
        targetY = clamp(targetY + deltaY, 0, maxScroll);
        if (x.behavior === 'smooth') {
          startAnimation();
        } else {
          currentY = targetY;
          scroller.style.transform = `translate3d(0, -${round2(currentY)}px, 0)`;
          dispatchScrollEvent();
        }
      } else {
        const deltaY = typeof y === 'number' ? y : 0;
        targetY = clamp(targetY + deltaY, 0, maxScroll);
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
          dispatchScrollEvent();
        }
      },
      scrollBy: (deltaY, smooth = true) => {
        targetY = clamp(targetY + deltaY, 0, maxScroll);
        if (smooth) {
          startAnimation();
        } else {
          currentY = targetY;
          scroller.style.transform = `translate3d(0, -${round2(currentY)}px, 0)`;
          dispatchScrollEvent();
        }
      },
      getPosition: () => currentY,
      getMaxScroll: () => maxScroll,
      updateBounds: () => {
        updateBounds();
        dispatchScrollEvent();
      },
      setConfig: (newConfig) => {
        Object.assign(config, newConfig);
      },
      isAnimating: () => isAnimating,
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

        // Restore native scrollTo
        window.scrollTo = originalScrollTo;

        // Clean up
        if (rafId) cancelAnimationFrame(rafId);
      }
    };

    // Initialize - dispatch initial scroll event and start first frame
    dispatchScrollEvent();
    startAnimation();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, but wait a tick to ensure all scripts have run
    setTimeout(init, 0);
  }
})();