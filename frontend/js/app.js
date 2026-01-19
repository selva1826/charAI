/**
 * NeuroNarrative - Complete Implementation
 * All features: Voice, Emotions, Anti-Freeze, Themes, Analytics
 */

console.log('🌊 NeuroNarrative Loading...');

let currentChild = null;
let currentCharacter = null;
let selectedEmotion = null;
let characters = {};
let currentSessionId = null;
let currentTheme = 'ocean';
let antiFreezeTimer = null;
let turnCount = 0;
let voiceMode = false;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let speechSynthesis = window.speechSynthesis;
let currentAIEmotion = 'neutral';

// Character data with real image paths and emoji fallbacks
const CHARACTER_INFO = {
    'nandhini': { 
        img: '/assets/emma-pufferfish.png',
        emoji: '🐡',
        desc: 'Helps identify and express feelings',
        greeting: "Hi! I'm Nandhini. How are you feeling today?",
        emotions: {
            neutral: '/assets/nandhini-neutral.png',
            happy: '/assets/nandhini-happy.png',
            sad: '/assets/nandhini-sad.png',
            thinking: '/assets/nandhini-thinking.png',
            excited: '/assets/nandhini-excited.png',
            concerned: '/assets/nandhini-concerned.png',
            encouraging: '/assets/nandhini-encouraging.png'
        }
    },
    'samyuktha': { 
        img: '/assets/sam-octopus.png',
        emoji: '🐙',
        desc: 'Teaches conversation and social skills',
        greeting: "Hi! I'm Samyuktha. Let's chat and have fun!",
        emotions: {
            neutral: '/assets/samyuktha-neutral.png',
            happy: '/assets/samyuktha-happy.png',
            sad: '/assets/samyuktha-sad.png',
            thinking: '/assets/samyuktha-thinking.png',
            excited: '/assets/samyuktha-excited.png',
            concerned: '/assets/samyuktha-concerned.png',
            encouraging: '/assets/samyuktha-encouraging.png'
        }
    },
    'naveen': { 
        img: '/assets/steve-turtle.png',
        emoji: '🐢',
        desc: 'Inspires creative storytelling',
        greeting: "Hi! I'm Naveen. Let's create an amazing story together!",
        emotions: {
            neutral: '/assets/naveen-neutral.png',
            happy: '/assets/naveen-happy.png',
            sad: '/assets/naveen-sad.png',
            thinking: '/assets/naveen-thinking.png',
            excited: '/assets/naveen-excited.png',
            concerned: '/assets/naveen-concerned.png',
            encouraging: '/assets/naveen-encouraging.png'
        }
    },
    'ramanujan': { 
        img: '/assets/pete-crab.png',
        emoji: '🦀',
        desc: 'Teaches problem-solving',
        greeting: "Hi! I'm Ramanujan. I can help you solve puzzles!",
        emotions: {
            neutral: '/assets/ramanujan-neutral.png',
            happy: '/assets/ramanujan-happy.png',
            sad: '/assets/ramanujan-sad.png',
            thinking: '/assets/ramanujan-thinking.png',
            excited: '/assets/ramanujan-excited.png',
            concerned: '/assets/ramanujan-concerned.png',
            encouraging: '/assets/ramanujan-encouraging.png'
        }
    },
    'rita': {
        img: '/assets/rita-seahorse.png',
        emoji: '🦭',
        desc: 'Helps organize daily routines',
        greeting: "Hi! I'm Rita. I can help you plan your day!",
        emotions: {
            neutral: '/assets/rita-neutral.png',
            happy: '/assets/rita-happy.png',
            sad: '/assets/rita-sad.png',
            thinking: '/assets/rita-thinking.png',
            excited: '/assets/rita-excited.png',
            concerned: '/assets/rita-concerned.png',
            encouraging: '/assets/rita-encouraging.png'
        }
    }
};

// ==================== IMAGE FALLBACK SYSTEM ====================

function setupImageFallback() {
    /**
     * Automatically replaces broken images with emoji fallbacks
     */
    document.addEventListener('error', function(e) {
        if (e.target.tagName === 'IMG') {
            const img = e.target;
            
            // Check if already has fallback (prevent infinite loop)
            if (img.classList.contains('fallback-applied')) {
                return;
            }
            
            // Get character from src
            let emoji = '🎭'; // Default emoji
            
            if (img.src.includes('nandhini') || img.src.includes('emma')) {
                emoji = '🐡';
            } else if (img.src.includes('samyuktha') || img.src.includes('sam')) {
                emoji = '🐙';
            } else if (img.src.includes('naveen') || img.src.includes('steve')) {
                emoji = '🐢';
            } else if (img.src.includes('ramanujan') || img.src.includes('pete')) {
                emoji = '🦀';
            } else if (img.src.includes('rita')) {
                emoji = '🦭';
            }
            
            // Mark as fallback applied
            img.classList.add('fallback-applied');
            img.style.display = 'none';
            
            // Create emoji replacement
            const emojiSpan = document.createElement('span');
            emojiSpan.className = 'emoji-fallback';
            emojiSpan.textContent = emoji;
            
            // Match size of original image
            if (img.classList.contains('character-image')) {
                emojiSpan.style.fontSize = '80px';
                emojiSpan.style.width = '120px';
                emojiSpan.style.height = '120px';
                emojiSpan.style.display = 'flex';
                emojiSpan.style.alignItems = 'center';
                emojiSpan.style.justifyContent = 'center';
                emojiSpan.style.margin = '0 auto 15px';
                emojiSpan.style.borderRadius = '50%';
                emojiSpan.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            } else if (img.classList.contains('ai-emotion-image')) {
                emojiSpan.style.fontSize = '100px';
                emojiSpan.style.width = '140px';
                emojiSpan.style.height = '140px';
                emojiSpan.style.display = 'flex';
                emojiSpan.style.alignItems = 'center';
                emojiSpan.style.justifyContent = 'center';
                emojiSpan.style.borderRadius = '20px';
                emojiSpan.style.background = 'rgba(255, 255, 255, 0.5)';
            } else {
                emojiSpan.style.fontSize = '40px';
            }
            
            img.parentNode.insertBefore(emojiSpan, img);
            
            console.log(`🖼️ Image fallback: ${img.src.split('/').pop()} → ${emoji}`);
        }
    }, true);
}

// ==================== INITIALIZATION ====================

window.onload = function() {
    console.log('🚀 PAGE LOADED');
    
    // Setup image fallback system
    setupImageFallback();
    
    loadChildren();
    loadThemes();
    
    // Setup button listeners
    document.getElementById('btn-create-child').onclick = createChild;
    document.getElementById('btn-logout').onclick = logout;
    document.getElementById('btn-back').onclick = backToCharacters;
    document.getElementById('btn-send').onclick = sendMessage;
    document.getElementById('btn-end-session').onclick = endSession;
    document.getElementById('btn-view-dashboard').onclick = viewDashboard;
    document.getElementById('btn-back-from-dashboard').onclick = backFromDashboard;
    
    // Voice toggle
    document.getElementById('voice-toggle').onchange = toggleVoiceMode;
    document.getElementById('btn-record').onclick = toggleRecording;
    
    // Enter key for message input
    const input = document.getElementById('message-input');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Auto-resize textarea
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            resetAntiFreezeTimer();
        });
    }
    
    // Emotion buttons
    document.querySelectorAll('.emotion-btn').forEach(btn => {
        btn.onclick = function() {
            const emotion = this.getAttribute('data-emotion');
            selectEmotion(emotion);
        };
    });
    
    // Theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.onclick = function() {
            const theme = this.getAttribute('data-theme');
            changeTheme(theme);
        };
    });
    
    // Anti-freeze option buttons
    document.querySelectorAll('.anti-freeze-btn').forEach(btn => {
        btn.onclick = function() {
            const option = this.getAttribute('data-option');
            handleAntiFreezeOption(option);
        };
    });
    
    console.log('✅ INITIALIZED');
};

// ==================== VOICE MODE ====================

function toggleVoiceMode() {
    voiceMode = document.getElementById('voice-toggle').checked;
    
    if (voiceMode) {
        // Switch to voice mode
        document.getElementById('text-input-mode').classList.remove('active');
        document.getElementById('voice-input-mode').classList.add('active');
        console.log('🎤 Voice mode enabled');
    } else {
        // Switch to text mode
        document.getElementById('voice-input-mode').classList.remove('active');
        document.getElementById('text-input-mode').classList.add('active');
        console.log('⌨️ Text mode enabled');
        
        // Stop recording if active
        if (isRecording) {
            stopRecording();
        }
    }
}

async function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await sendVoiceMessage(audioBlob);
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        
        // Update UI
        document.getElementById('btn-record').classList.add('recording');
        document.getElementById('recording-indicator').classList.remove('hidden');
        
        console.log('🎤 Recording started');
        
    } catch (error) {
        console.error('Microphone error:', error);
        alert('Could not access microphone. Please check permissions.');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        // Update UI
        document.getElementById('btn-record').classList.remove('recording');
        document.getElementById('recording-indicator').classList.add('hidden');
        
        console.log('🎤 Recording stopped');
    }
}

async function sendVoiceMessage(audioBlob) {
    console.log('📤 Sending voice message...');
    
    resetAntiFreezeTimer();
    showTyping();
    
    try {
        // Create FormData
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('child_id', currentChild.id);
        formData.append('character', currentCharacter);
        formData.append('session_id', currentSessionId);
        if (selectedEmotion) {
            formData.append('emotion', selectedEmotion);
        }
        
        // Send to backend
        const response = await fetch('http://127.0.0.1:5000/api/chat/voice', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log('📥 Response:', data);
        
        removeTyping();
        
        // Add user message (transcribed text)
        addMessage(data.transcribed_text, 'user', selectedEmotion);
        
        // Add AI response
        addMessage(data.response, 'ai');
        
        // Speak the response
        speakText(data.response);
        
        // Update AI emotion
        if (data.ai_emotion) {
            updateAIEmotion(data.ai_emotion);
        }
        
        if (data.xp_gained) {
            updateXP(data.xp_gained);
        }
        
        if (data.badges_earned && data.badges_earned.length > 0) {
            showBadgeNotification(data.badges_earned);
        }
        
        // Reset emotion
        selectedEmotion = null;
        document.querySelectorAll('.emotion-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        turnCount++;
        
    } catch (error) {
        console.error('❌ Error:', error);
        removeTyping();
        addMessage('Sorry, I could not hear you. Please try again.', 'ai');
    }
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Try to use a child-friendly voice
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
            v.name.includes('Female') || 
            v.name.includes('Google') || 
            v.name.includes('child')
        );
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        speechSynthesis.speak(utterance);
        console.log('🔊 Speaking:', text);
    }
}

// ==================== AI EMOTION DISPLAY ====================

function updateAIEmotion(emotion) {
    currentAIEmotion = emotion;
    
    const emotionImg = document.getElementById('ai-emotion-img');
    const emotionLabel = document.getElementById('ai-emotion-label');
    
    const charEmotions = CHARACTER_INFO[currentCharacter].emotions;
    
    if (charEmotions && charEmotions[emotion]) {
        emotionImg.src = charEmotions[emotion];
        emotionLabel.textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);
        
        // Add animation
        emotionImg.classList.remove('emotion-change');
        void emotionImg.offsetWidth; // Force reflow
        emotionImg.classList.add('emotion-change');
        
        console.log('🎭 AI emotion:', emotion);
    }
}

function detectEmotionFromText(text) {
    // Simple keyword-based emotion detection
    const lowercaseText = text.toLowerCase();
    
    if (lowercaseText.includes('!') || lowercaseText.includes('great') || lowercaseText.includes('wonderful')) {
        return 'excited';
    } else if (lowercaseText.includes('?') && lowercaseText.split(' ').length > 8) {
        return 'thinking';
    } else if (lowercaseText.includes('sorry') || lowercaseText.includes('understand')) {
        return 'concerned';
    } else if (lowercaseText.includes('good') || lowercaseText.includes('nice')) {
        return 'happy';
    } else if (lowercaseText.includes('try') || lowercaseText.includes('can')) {
        return 'encouraging';
    } else {
        return 'neutral';
    }
}

// ==================== THEMES ====================

async function loadThemes() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/themes');
        const data = await response.json();
        console.log('Themes loaded:', data.themes);
    } catch (error) {
        console.error('Error loading themes:', error);
    }
}

function changeTheme(theme) {
    console.log('Changing theme to:', theme);
    currentTheme = theme;
    
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
    
    const bg = document.getElementById('theme-background');
    bg.className = `theme-background ${theme}-theme`;
    
    if (currentChild) {
        fetch('http://127.0.0.1:5000/api/themes/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                child_id: currentChild.id,
                theme: theme
            })
        });
    }
}

// ==================== CHILDREN ====================

async function loadChildren() {
    console.log('👶 Loading children...');
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/children');
        const data = await response.json();
        
        const container = document.getElementById('child-cards');
        container.innerHTML = '';
        
        if (data.children && data.children.length > 0) {
            data.children.forEach(child => {
                const card = document.createElement('div');
                card.className = 'child-card';
                card.innerHTML = `
                    <div class="avatar-large">${child.avatar}</div>
                    <h3>${child.name}</h3>
                    <span class="level-badge">Level ${child.level}</span>
                `;
                
                card.onclick = () => selectChild(child.id);
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p style="text-align:center;padding:20px;color:#636e72;">No profiles yet. Create one below!</p>';
        }
    } catch (error) {
        console.error('❌ Error loading children:', error);
    }
}

async function createChild() {
    const name = document.getElementById('new-child-name').value.trim();
    
    if (!name) {
        alert('Please enter a name!');
        return;
    }
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, avatar: '👦' })
        });
        
        const data = await response.json();
        
        document.getElementById('new-child-name').value = '';
        await loadChildren();
        alert(`Welcome, ${name}! 🎉`);
    } catch (error) {
        console.error('❌ Error creating child:', error);
    }
}

async function selectChild(childId) {
    console.log('👦 Selecting child:', childId);
    
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/children/${childId}`);
        const data = await response.json();
        currentChild = data.child;
        
        document.getElementById('profile-avatar').textContent = currentChild.avatar;
        document.getElementById('profile-name').textContent = currentChild.name;
        document.getElementById('profile-level').textContent = `Level ${currentChild.level}`;
        document.getElementById('streak-days').textContent = `${currentChild.streak} Day Streak`;
        
        const xpForLevel = 100 * currentChild.level;
        const xpProgress = (currentChild.xp / xpForLevel) * 100;
        document.getElementById('xp-fill').style.width = `${Math.min(xpProgress, 100)}%`;
        document.getElementById('xp-value').textContent = `${currentChild.xp} / ${xpForLevel} XP`;
        
        updateBadges(currentChild.badges || []);
        
        await loadCharacters();
        
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        
        console.log('✅ Child selected');
    } catch (error) {
        console.error('❌ Error selecting child:', error);
    }
}

function updateBadges(badges) {
    const badgeElements = document.querySelectorAll('.badge-item');
    const badgeNames = ['First Words', 'Chatty Friend', 'Emotion Expert', 'Story Master', 'Problem Solver', 'Routine Hero'];
    
    badgeElements.forEach((elem, idx) => {
        const badgeName = badgeNames[idx];
        const earned = badges.some(b => b.badge_name === badgeName);
        
        if (earned) {
            elem.classList.remove('locked');
            elem.classList.add('earned');
        }
    });
}

function logout() {
    currentChild = null;
    currentCharacter = null;
    currentSessionId = null;
    document.getElementById('app-screen').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
}

// ==================== CHARACTERS ====================

async function loadCharacters() {
    console.log('🎭 Loading characters...');
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/characters');
        const data = await response.json();
        characters = data.characters;
        
        const grid = document.getElementById('character-grid');
        grid.innerHTML = '';
        
        Object.keys(characters).forEach(charId => {
            const char = characters[charId];
            const info = CHARACTER_INFO[charId];
            
            if (!info) return;
            
            const card = document.createElement('div');
            card.className = 'character-card';
            card.innerHTML = `
                <img src="${info.img}" 
                     class="character-image" 
                     alt="${char.name}">
                <h3>${char.name}</h3>
                <p class="character-role">${char.role}</p>
                <p class="character-desc">${info.desc}</p>
                <button class="btn-start-chat">💬 Start Chat</button>
            `;
            
            card.onclick = function(e) {
                if (e.target.classList.contains('btn-start-chat')) return;
                openChat(charId);
            };
            
            const btn = card.querySelector('.btn-start-chat');
            btn.onclick = function(e) {
                e.stopPropagation();
                openChat(charId);
            };
            
            grid.appendChild(card);
        });
        
        console.log('✅ Characters loaded');
    } catch (error) {
        console.error('❌ Error loading characters:', error);
    }
}

async function openChat(charId) {
    console.log('🚀 Opening chat for:', charId);
    
    currentCharacter = charId;
    const char = characters[charId];
    const info = CHARACTER_INFO[charId];
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                child_id: currentChild.id,
                character: charId,
                theme: currentTheme,
                mode: 'type'
            })
        });
        
        const data = await response.json();
        currentSessionId = data.session_id;
        turnCount = 0;
        
        console.log('Session started:', currentSessionId);
    } catch (error) {
        console.error('Error starting session:', error);
    }
    
    document.getElementById('chat-character-img').src = info.img;
    document.getElementById('chat-character-name').textContent = char.name;
    document.getElementById('chat-character-role').textContent = char.role;
    
    // Set initial AI emotion
    updateAIEmotion('neutral');
    
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = `
        <div class="message ai-message">
            <img src="${info.img}" class="message-avatar-img" alt="${char.name}">
            <div class="message-content">
                <p class="message-bubble">${info.greeting}</p>
            </div>
        </div>
    `;
    
    // Speak greeting if voice mode
    if (voiceMode) {
        speakText(info.greeting);
    }
    
    const charSelection = document.getElementById('character-selection');
    const chatScreen = document.getElementById('chat-screen');
    
    charSelection.classList.remove('active');
    charSelection.style.display = 'none';
    
    chatScreen.classList.add('active');
    chatScreen.style.display = 'flex';
    
    startAntiFreezeTimer();
    
    console.log('✅ Chat opened');
}

async function endSession() {
    if (!currentSessionId) return;
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/session/end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId })
        });
        
        const data = await response.json();
        
        alert(`Session complete!\n\nDuration: ${data.duration} minutes\nTurns: ${data.turns}\n\n${data.summary}`);
        
        backToCharacters();
    } catch (error) {
        console.error('Error ending session:', error);
    }
}

function backToCharacters() {
    console.log('← Going back to characters');
    
    stopAntiFreezeTimer();
    speechSynthesis.cancel();
    
    const chatScreen = document.getElementById('chat-screen');
    const charSelection = document.getElementById('character-selection');
    
    chatScreen.classList.remove('active');
    chatScreen.style.display = 'none';
    
    charSelection.classList.add('active');
    charSelection.style.display = 'flex';
    
    selectedEmotion = null;
    currentSessionId = null;
    
    // Reset voice mode
    document.getElementById('voice-toggle').checked = false;
    toggleVoiceMode();
    
    document.querySelectorAll('.emotion-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
}

// ==================== ANTI-FREEZE ====================

function startAntiFreezeTimer() {
    resetAntiFreezeTimer();
}

function resetAntiFreezeTimer() {
    if (antiFreezeTimer) {
        clearTimeout(antiFreezeTimer);
    }
    
    document.getElementById('anti-freeze-overlay').classList.add('hidden');
    
    antiFreezeTimer = setTimeout(() => {
        activateAntiFreeze();
    }, 40000);
}

function stopAntiFreezeTimer() {
    if (antiFreezeTimer) {
        clearTimeout(antiFreezeTimer);
        antiFreezeTimer = null;
    }
    document.getElementById('anti-freeze-overlay').classList.add('hidden');
}

async function activateAntiFreeze() {
    console.log('⏰ Anti-Freeze activated!');
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/antifreeze/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId })
        });
        
        const data = await response.json();
        
        if (data.should_activate) {
            document.getElementById('continue-text').textContent = data.prompts.continue;
            document.getElementById('shift-text').textContent = data.prompts.shift;
            
            document.getElementById('anti-freeze-overlay').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error checking anti-freeze:', error);
    }
}

async function handleAntiFreezeOption(option) {
    console.log('Anti-freeze option selected:', option);
    
    try {
        await fetch('http://127.0.0.1:5000/api/antifreeze/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentSessionId,
                option: option
            })
        });
    } catch (error) {
        console.error('Error logging anti-freeze:', error);
    }
    
    document.getElementById('anti-freeze-overlay').classList.add('hidden');
    
    if (option === 'break') {
        endSession();
    } else {
        resetAntiFreezeTimer();
    }
}

// ==================== EMOTIONS ====================

function selectEmotion(emotion) {
    console.log('😊 Emotion selected:', emotion);
    selectedEmotion = emotion;
    
    document.querySelectorAll('.emotion-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    const btn = document.querySelector(`[data-emotion="${emotion}"]`);
    if (btn) btn.classList.add('selected');
    
    triggerEmojiScaffolding(emotion);
}

async function triggerEmojiScaffolding(emotion) {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/emoji/scaffold', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emotion: emotion,
                child_id: currentChild.id,
                character: currentCharacter,
                session_id: currentSessionId
            })
        });
        
        const data = await response.json();
        
        document.getElementById('message-input').value = data.completion;
        
        console.log('Emoji scaffolding:', data.completion);
    } catch (error) {
        console.error('Error with emoji scaffolding:', error);
    }
}

// ==================== CHAT ====================

async function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    console.log('📤 Sending:', message);
    
    resetAntiFreezeTimer();
    
    addMessage(message, 'user', selectedEmotion);
    input.value = '';
    input.style.height = 'auto';
    
    turnCount++;
    
    showTyping();
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                child_id: currentChild.id,
                character: currentCharacter,
                message: message,
                emotion: selectedEmotion,
                session_id: currentSessionId
            })
        });
        
        const data = await response.json();
        console.log('📥 Response:', data);
        
        removeTyping();
        addMessage(data.response, 'ai');
        
        // Detect emotion from response
        const detectedEmotion = detectEmotionFromText(data.response);
        updateAIEmotion(detectedEmotion);
        
        // Speak response if voice mode
        if (voiceMode) {
            speakText(data.response);
        }
        
        if (data.xp_gained) {
            updateXP(data.xp_gained);
        }
        
        if (data.badges_earned && data.badges_earned.length > 0) {
            showBadgeNotification(data.badges_earned);
        }
        
        selectedEmotion = null;
        document.querySelectorAll('.emotion-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        removeTyping();
        addMessage('Sorry, something went wrong. Please try again.', 'ai');
    }
}

function addMessage(text, sender, emotion = null) {
    const container = document.getElementById('chat-messages');
    const info = CHARACTER_INFO[currentCharacter];
    
    const div = document.createElement('div');
    div.className = `message ${sender}-message`;
    
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    let emotionBadge = '';
    if (emotion && sender === 'user') {
        const emotionLabels = {
            happy: '😊 Happy',
            sad: '😢 Sad',
            angry: '😠 Angry',
            scared: '😨 Scared',
            excited: '🤩 Excited',
            calm: '😌 Calm'
        };
        emotionBadge = `<span class="message-emotion">${emotionLabels[emotion]}</span>`;
    }
    
    if (sender === 'user') {
        div.innerHTML = `
            <div class="message-avatar">${currentChild.avatar}</div>
            <div class="message-content">
                <p class="message-bubble">${text}</p>
                ${emotionBadge}
                <p class="message-timestamp">${timestamp}</p>
            </div>
        `;
    } else {
        div.innerHTML = `
            <img src="${info.img}" class="message-avatar-img" alt="">
            <div class="message-content">
                <p class="message-bubble">${text}</p>
                <p class="message-timestamp">${timestamp}</p>
            </div>
        `;
    }
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showTyping() {
    const container = document.getElementById('chat-messages');
    const info = CHARACTER_INFO[currentCharacter];
    
    const div = document.createElement('div');
    div.id = 'typing-indicator';
    div.className = 'typing-indicator';
    div.innerHTML = `
        <img src="${info.img}" class="message-avatar-img" alt="">
        <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function removeTyping() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

function updateXP(xpGained) {
    currentChild.xp += xpGained;
    const xpForLevel = 100 * currentChild.level;
    const xpProgress = (currentChild.xp / xpForLevel) * 100;
    document.getElementById('xp-fill').style.width = `${Math.min(xpProgress, 100)}%`;
    document.getElementById('xp-value').textContent = `${currentChild.xp} / ${xpForLevel} XP`;
}

function showBadgeNotification(badges) {
    badges.forEach(badge => {
        alert(`🏆 New Badge Earned: ${badge}!`);
    });
}

// ==================== DASHBOARD ====================

async function viewDashboard() {
    console.log('📊 Loading dashboard...');
    
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/analytics/parent/${currentChild.id}`);
        const data = await response.json();
        
        document.getElementById('stat-sessions').textContent = data.total_sessions || 0;
        document.getElementById('stat-turns').textContent = data.avg_turns_per_session?.toFixed(1) || 0;
        document.getElementById('stat-emoji').textContent = `${data.emoji_accuracy?.toFixed(0) || 0}%`;
        document.getElementById('stat-level').textContent = data.level || 1;
        
        const sessionList = document.getElementById('session-list');
        sessionList.innerHTML = '';
        
        if (data.recent_sessions && data.recent_sessions.length > 0) {
            data.recent_sessions.forEach(session => {
                const item = document.createElement('div');
                item.className = 'session-item';
                item.innerHTML = `
                    <div class="session-character">${characters[session.character]?.emoji || '🎭'} ${characters[session.character]?.name || session.character}</div>
                    <div class="session-details">
                        <span>${session.turn_count} turns</span>
                        <span>${session.duration_minutes?.toFixed(1) || 0} min</span>
                        <span>${new Date(session.start_time).toLocaleDateString()}</span>
                    </div>
                `;
                sessionList.appendChild(item);
            });
        } else {
            sessionList.innerHTML = '<p style="text-align:center;padding:20px;color:#636e72;">No sessions yet. Start chatting!</p>';
        }
        
        document.getElementById('character-selection').classList.remove('active');
        document.getElementById('character-selection').style.display = 'none';
        document.getElementById('parent-dashboard').classList.add('active');
        document.getElementById('parent-dashboard').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function backFromDashboard() {
    document.getElementById('parent-dashboard').classList.remove('active');
    document.getElementById('parent-dashboard').style.display = 'none';
    document.getElementById('character-selection').classList.add('active');
    document.getElementById('character-selection').style.display = 'flex';
}

console.log('✅ Script loaded');
