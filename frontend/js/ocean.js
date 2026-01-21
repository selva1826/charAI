/**
 * NeuroNarrative - Ocean Animations
 * Dynamic ocean environment enhancements using image assets
 */

'use strict';

/**
 * Initialize ocean environment
 */
function initOceanAnimations() {
    console.log('🌊 Initializing ocean environment...');
    
    // Create dynamic bubbles
    createDynamicBubbles();
    
    // Create floating fish
    createSwimmingFish();
    
    // Add calm mode toggle support
    setupCalmMode();
    
    console.log('✅ Ocean environment ready!');
}

/**
 * Create dynamic bubble elements
 */
function createDynamicBubbles() {
    const container = document.getElementById('bubbles-layer');
    if (!container) return;
    
    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Create 15 bubbles with varying properties
    for (let i = 0; i < 15; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'dynamic-bubble';
        
        // Random properties
        const size = Math.random() * 20 + 8; // 8-28px
        const left = Math.random() * 100; // 0-100%
        const duration = Math.random() * 10 + 10; // 10-20s
        const delay = Math.random() * 10; // 0-10s
        
        bubble.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${left}%;
            bottom: -${size}px;
            border-radius: 50%;
            background: radial-gradient(
                circle at 30% 30%,
                rgba(255, 255, 255, 0.9) 0%,
                rgba(255, 255, 255, 0.4) 40%,
                rgba(200, 230, 255, 0.2) 100%
            );
            animation: dynamicBubbleRise ${duration}s linear infinite;
            animation-delay: ${delay}s;
            pointer-events: none;
        `;
        
        fragment.appendChild(bubble);
    }
    
    container.appendChild(fragment);
    
    // Add the animation style if not already present
    if (!document.getElementById('bubble-animation-style')) {
        const style = document.createElement('style');
        style.id = 'bubble-animation-style';
        style.textContent = `
            @keyframes dynamicBubbleRise {
                0% {
                    transform: translateY(0) translateX(0) scale(0.5);
                    opacity: 0;
                }
                5% {
                    opacity: 0.8;
                }
                25% {
                    transform: translateY(-25vh) translateX(15px) scale(0.7);
                }
                50% {
                    transform: translateY(-50vh) translateX(-10px) scale(0.85);
                    opacity: 0.6;
                }
                75% {
                    transform: translateY(-75vh) translateX(10px) scale(0.95);
                }
                100% {
                    transform: translateY(-100vh) translateX(-5px) scale(1);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Create swimming fish using CSS
 */
function createSwimmingFish() {
    const container = document.getElementById('ocean-world');
    if (!container) return;
    
    const fishColors = [
        { main: '#FF9B6A', accent: '#FF7043' },
        { main: '#FFD166', accent: '#F7B731' },
        { main: '#A8E6CF', accent: '#69C9A3' },
        { main: '#FF9B9B', accent: '#E88B8B' },
        { main: '#B8D4FF', accent: '#8BBDD0' }
    ];
    
    // Create 3 fish using CSS
    for (let i = 0; i < 3; i++) {
        const fish = document.createElement('div');
        fish.className = 'swimming-fish';
        
        const color = fishColors[i % fishColors.length];
        const size = 25 + Math.random() * 15; // 25-40px
        const startY = 20 + Math.random() * 40; // 20-60%
        const duration = 20 + Math.random() * 15; // 20-35s
        const delay = i * 5;
        
        fish.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size * 0.6}px;
            left: -${size + 10}px;
            top: ${startY}%;
            background: ${color.main};
            border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
            animation: swimFish ${duration}s linear infinite;
            animation-delay: ${delay}s;
            pointer-events: none;
            z-index: 1;
        `;
        
        // Add tail
        const tail = document.createElement('div');
        tail.style.cssText = `
            position: absolute;
            right: -${size * 0.3}px;
            top: 50%;
            transform: translateY(-50%);
            width: 0;
            height: 0;
            border-top: ${size * 0.25}px solid transparent;
            border-bottom: ${size * 0.25}px solid transparent;
            border-left: ${size * 0.35}px solid ${color.accent};
        `;
        fish.appendChild(tail);
        
        // Add eye
        const eye = document.createElement('div');
        eye.style.cssText = `
            position: absolute;
            left: 15%;
            top: 30%;
            width: ${size * 0.15}px;
            height: ${size * 0.15}px;
            background: white;
            border-radius: 50%;
        `;
        const pupil = document.createElement('div');
        pupil.style.cssText = `
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 50%;
            height: 50%;
            background: #333;
            border-radius: 50%;
        `;
        eye.appendChild(pupil);
        fish.appendChild(eye);
        
        container.appendChild(fish);
    }
    
    // Add fish swimming animation
    if (!document.getElementById('fish-animation-style')) {
        const style = document.createElement('style');
        style.id = 'fish-animation-style';
        style.textContent = `
            @keyframes swimFish {
                0% { left: -60px; transform: scaleX(1); }
                49% { left: calc(100% + 60px); transform: scaleX(1); }
                50% { left: calc(100% + 60px); transform: scaleX(-1); }
                99% { left: -60px; transform: scaleX(-1); }
                100% { left: -60px; transform: scaleX(1); }
            }
            
            .swimming-fish {
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
            }
            
            @media (prefers-reduced-motion: reduce) {
                .swimming-fish,
                .dynamic-bubble {
                    display: none;
                }
            }
            
            body.calm-mode .swimming-fish,
            body.calm-mode .dynamic-bubble {
                animation-play-state: paused;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Setup calm mode toggle
 */
function setupCalmMode() {
    const calmBtn = document.getElementById('btn-reduce-motion');
    if (!calmBtn) return;
    
    // Restore saved preference
    if (localStorage.getItem('calmMode') === 'true') {
        document.body.classList.add('calm-mode');
        calmBtn.setAttribute('aria-pressed', 'true');
        const textSpan = calmBtn.querySelector('span:last-child');
        if (textSpan) textSpan.textContent = 'Motion On';
    }
}

/**
 * Sound toggle functionality
 */
function setupSoundToggle() {
    const soundBtn = document.getElementById('btn-sound-toggle');
    if (!soundBtn) return;
    
    // Restore saved preference
    if (localStorage.getItem('soundsOff') === 'true') {
        document.body.classList.add('sounds-off');
        soundBtn.setAttribute('aria-pressed', 'false');
        const textSpan = soundBtn.querySelector('span:last-child');
        if (textSpan) textSpan.textContent = 'Sounds Off';
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initOceanAnimations();
        setupSoundToggle();
    });
} else {
    initOceanAnimations();
    setupSoundToggle();
}

console.log('✅ Ocean module loaded');
