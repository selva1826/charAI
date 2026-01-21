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
let speechRecognition = null;
let currentAIEmotion = 'neutral';
let chatHistory = [];
let messageCount = 0;
let contextSummary = '';
let childEvaluation = {
    emotionTracking: [],
    communicationSkills: { clarity: 0, engagement: 0, reciprocity: 0 },
    socialMetrics: { turnTaking: 0, responseLatency: [], topicMaintenance: 0 },
    maturityIndicators: { sentenceComplexity: 0, vocabularyDiversity: 0 }
};

// Character data with real image paths and emoji fallbacks
// Using available ocean assets for emotions
const EMOTION_ASSETS = {
    neutral: '/assets/calm-turtle.png',
    happy: '/assets/happy-fish.png',
    sad: '/assets/sad-clam.png',
    excited: '/assets/excited-dolphin.png',
    angry: '/assets/angry-puffer.png',
    scared: '/assets/scared-jellyfish.png',
    thinking: '/assets/calm-turtle.png',
    concerned: '/assets/sad-clam.png',
    encouraging: '/assets/happy-fish.png'
};

const CHARACTER_INFO = {
    'nandhini': { 
        img: '/assets/emma-pufferfish.png',
        emoji: '🐡',
        desc: 'Helps identify and express feelings',
        greeting: "Hi! I'm Nandhini. How are you feeling today?",
        emotions: EMOTION_ASSETS
    },
    'samyuktha': { 
        img: '/assets/sam-octopus.png',
        emoji: '🐙',
        desc: 'Teaches conversation and social skills',
        greeting: "Hi! I'm Samyuktha. Let's chat and have fun!",
        emotions: EMOTION_ASSETS
    },
    'naveen': { 
        img: '/assets/steve-turtle.png',
        emoji: '🐢',
        desc: 'Inspires creative storytelling',
        greeting: "Hi! I'm Naveen. Let's create an amazing story together!",
        emotions: EMOTION_ASSETS
    },
    'ramanujan': { 
        img: '/assets/pete-crab.png',
        emoji: '🦀',
        desc: 'Teaches problem-solving',
        greeting: "Hi! I'm Ramanujan. I can help you solve puzzles!",
        emotions: EMOTION_ASSETS
    },
    'rita': {
        img: '/assets/rita-seahorse.png',
        emoji: '🦭',
        desc: 'Helps organize daily routines',
        greeting: "Hi! I'm Rita. I can help you plan your day!",
        emotions: EMOTION_ASSETS
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

function initSpeechRecognition() {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn('⚠️ Speech Recognition not supported in this browser');
        return false;
    }
    
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = false;
    speechRecognition.interimResults = true;
    speechRecognition.lang = 'en-US';
    
    speechRecognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Show interim results
        if (interimTranscript) {
            document.querySelector('.recording-text').textContent = interimTranscript;
        }
        
        // Process final result
        if (finalTranscript) {
            console.log('🎤 Transcribed:', finalTranscript);
            processVoiceMessage(finalTranscript);
        }
    };
    
    speechRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopRecording();
        if (event.error === 'not-allowed') {
            alert('Microphone access denied. Please enable microphone permissions.');
        }
    };
    
    speechRecognition.onend = () => {
        if (isRecording) {
            // Auto-restart for continuous listening
            stopRecording();
        }
    };
    
    return true;
}

async function startRecording() {
    try {
        // Initialize speech recognition if not already done
        if (!speechRecognition) {
            if (!initSpeechRecognition()) {
                alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
                return;
            }
        }
        
        // Request microphone permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        speechRecognition.start();
        isRecording = true;
        
        // Update UI
        document.getElementById('btn-record').classList.add('recording');
        document.getElementById('recording-indicator').classList.remove('hidden');
        document.querySelector('.recording-text').textContent = 'Listening...';
        
        console.log('🎤 Recording started');
        
    } catch (error) {
        console.error('Microphone error:', error);
        alert('Could not access microphone. Please check permissions.');
    }
}

function stopRecording() {
    if (speechRecognition && isRecording) {
        speechRecognition.stop();
        isRecording = false;
        
        // Update UI
        document.getElementById('btn-record').classList.remove('recording');
        document.getElementById('recording-indicator').classList.add('hidden');
        
        console.log('🎤 Recording stopped');
    }
}

async function processVoiceMessage(transcribedText) {
    console.log('📤 Processing voice message:', transcribedText);
    
    if (!transcribedText || transcribedText.trim() === '') {
        addMessage('Sorry, I couldn\'t hear you clearly. Can you try again?', 'ai');
        return;
    }
    
    resetAntiFreezeTimer();
    
    // Add user message
    addMessage(transcribedText, 'user', selectedEmotion);
    
    // Track for evaluation
    trackChildMessage(transcribedText);
    
    showTyping();
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                child_id: currentChild.id,
                character: currentCharacter,
                message: transcribedText,
                emotion: selectedEmotion,
                session_id: currentSessionId,
                context_summary: contextSummary
            })
        });
        
        const data = await response.json();
        console.log('📥 Response:', data);
        
        removeTyping();
        
        // Add AI response
        addMessage(data.response, 'ai');
        
        // Speak the response
        speakText(data.response);
        
        // Update AI emotion
        const detectedEmotion = detectEmotionFromText(data.response);
        updateAIEmotion(detectedEmotion);
        
        // Track conversation for summaries
        chatHistory.push({ role: 'user', content: transcribedText, emotion: selectedEmotion });
        chatHistory.push({ role: 'ai', content: data.response });
        messageCount++;
        
        // Generate summary every 8 messages
        if (messageCount % 4 === 0) { // 4 turns = 8 messages
            await generateContextSummary();
        }
        
        // Save to persistent storage
        saveChatToStorage();
        
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
        addMessage('Sorry, something went wrong. Please try again.', 'ai');
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
    
    // Reset session data
    resetSessionData();
    
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
        
        // Load previous context summary for this character if exists
        if (data.context_summary) {
            contextSummary = data.context_summary;
            console.log('📝 Loaded previous context:', contextSummary);
        }
        
        console.log('Session started:', currentSessionId);
    } catch (error) {
        console.error('Error starting session:', error);
        currentSessionId = Date.now();
    }
    
    document.getElementById('chat-character-img').src = info.img;
    document.getElementById('chat-character-name').textContent = char.name;
    document.getElementById('chat-character-role').textContent = char.role;
    
    // Set initial AI emotion
    updateAIEmotion('neutral');
    
    // Create personalized greeting based on context
    let greeting = info.greeting;
    if (contextSummary) {
        greeting = `Welcome back! I remember we were talking before. ${info.greeting}`;
    }
    
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = `
        <div class="message ai-message">
            <img src="${info.img}" class="message-avatar-img" alt="${char.name}">
            <div class="message-content">
                <p class="message-bubble">${greeting}</p>
            </div>
        </div>
    `;
    
    // Add greeting to chat history
    chatHistory.push({ role: 'ai', content: greeting, timestamp: Date.now() });
    
    // Speak greeting if voice mode
    if (voiceMode) {
        speakText(greeting);
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
    }, 60000); // 60 seconds
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
    
    // Track for evaluation
    trackChildMessage(message);
    
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
                session_id: currentSessionId,
                context_summary: contextSummary
            })
        });
        
        const data = await response.json();
        console.log('📥 Response:', data);
        
        removeTyping();
        addMessage(data.response, 'ai');
        
        // Track conversation for summaries
        chatHistory.push({ role: 'user', content: message, emotion: selectedEmotion, timestamp: Date.now() });
        chatHistory.push({ role: 'ai', content: data.response, timestamp: Date.now() });
        messageCount++;
        
        // Generate summary every 8 messages (4 turns)
        if (messageCount % 4 === 0) {
            await generateContextSummary();
        }
        
        // Save to persistent storage
        saveChatToStorage();
        
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
        
        // Update child info
        document.getElementById('dashboard-avatar').textContent = currentChild.avatar;
        document.getElementById('dashboard-name').textContent = currentChild.name;
        
        // Hero stats
        document.getElementById('stat-level').textContent = data.level || 1;
        document.getElementById('stat-streak').textContent = data.streak || 0;
        document.getElementById('stat-xp').textContent = data.xp || 0;
        
        // Main stats
        document.getElementById('stat-sessions').textContent = data.total_sessions || 0;
        document.getElementById('stat-turns').textContent = data.avg_turns_per_session?.toFixed(1) || 0;
        document.getElementById('stat-emoji').textContent = `${data.emoji_accuracy?.toFixed(0) || 0}%`;
        document.getElementById('stat-conversations').textContent = data.total_conversations || 0;
        
        // Render emotion chart
        renderEmotionChart(data.emotion_distribution || {});
        
        // Render activity chart
        renderActivityChart(data.weekly_activity || {});
        
        // Update communication progress bars
        if (data.communication_progress) {
            const clarityAvg = calculateArrayAverage(data.communication_progress.clarity);
            const engagementAvg = calculateArrayAverage(data.communication_progress.engagement);
            const reciprocityAvg = calculateArrayAverage(data.communication_progress.reciprocity);
            
            updateProgressBar('clarity', clarityAvg);
            updateProgressBar('engagement', engagementAvg);
            updateProgressBar('reciprocity', reciprocityAvg);
        }
        
        // Update maturity metrics
        if (data.maturity_metrics) {
            updateProgressBar('complexity', data.maturity_metrics.sentence_complexity);
            updateProgressBar('vocabulary', data.maturity_metrics.vocabulary_diversity);
            updateProgressBar('topic', data.maturity_metrics.topic_maintenance);
        }
        
        // Update emotional growth
        if (data.emotional_development) {
            document.getElementById('emotion-variety').textContent = data.emotional_development.emotion_variety || 0;
            document.getElementById('positive-ratio').textContent = `${data.emotional_development.positive_ratio || 0}%`;
            document.getElementById('total-expressions').textContent = data.emotional_development.total_expressions || 0;
        }
        
        // Render AI report
        const reportContainer = document.getElementById('ai-report');
        if (data.ai_report) {
            reportContainer.innerHTML = formatAIReport(data.ai_report);
        } else {
            reportContainer.innerHTML = '<p class="empty-state">Start chatting to generate personalized insights!</p>';
        }
        
        // Render character usage
        renderCharacterUsage(data.character_usage || {});
        
        // Render session list
        const sessionList = document.getElementById('session-list');
        sessionList.innerHTML = '';
        
        if (data.recent_sessions && data.recent_sessions.length > 0) {
            data.recent_sessions.forEach(session => {
                const charInfo = CHARACTER_INFO[session.character];
                const item = document.createElement('div');
                item.className = 'session-item';
                item.innerHTML = `
                    <div class="session-character">
                        <img src="${charInfo?.img || ''}" class="session-char-img" alt="">
                        <span>${characters[session.character]?.name || session.character}</span>
                    </div>
                    <div class="session-details">
                        <span class="session-stat">💬 ${session.turn_count || 0} turns</span>
                        <span class="session-stat">⏱️ ${session.duration_minutes?.toFixed(1) || 0} min</span>
                        <span class="session-date">${formatSessionDate(session.start_time)}</span>
                    </div>
                `;
                sessionList.appendChild(item);
            });
        } else {
            sessionList.innerHTML = '<p class="empty-state">No sessions yet. Start chatting with your AI friends!</p>';
        }
        
        // Render badges
        renderBadgesEarned(data.badges || []);
        
        // Render overall score
        renderOverallScore(data.overall_score || 0, data.developmental_stage);
        
        // Render milestones
        renderMilestones(data.milestones || []);
        
        // Render recommendations
        renderRecommendations(data.recommendations || []);
        
        document.getElementById('character-selection').classList.remove('active');
        document.getElementById('character-selection').style.display = 'none';
        document.getElementById('parent-dashboard').classList.add('active');
        document.getElementById('parent-dashboard').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function renderOverallScore(score, stage) {
    const scoreEl = document.getElementById('overall-score');
    const stageEl = document.getElementById('dev-stage');
    const descEl = document.getElementById('dev-description');
    const circleEl = document.getElementById('score-circle');
    
    if (scoreEl) scoreEl.textContent = Math.round(score);
    
    if (stage) {
        if (stageEl) {
            stageEl.textContent = stage.name;
            stageEl.style.color = stage.color;
        }
        if (descEl) descEl.textContent = stage.description;
        if (circleEl) {
            circleEl.style.setProperty('--score-percent', score);
            circleEl.style.setProperty('--score-color', stage.color);
        }
    }
}

function renderMilestones(milestones) {
    const container = document.getElementById('milestones-grid');
    if (!container) return;
    
    let html = '';
    
    for (const milestone of milestones) {
        html += `
            <div class="milestone-card ${milestone.achieved ? 'achieved' : 'locked'}">
                <span class="milestone-icon">${milestone.icon}</span>
                <div class="milestone-info">
                    <span class="milestone-name">${milestone.name}</span>
                    <span class="milestone-status">${milestone.achieved ? 'Achieved! 🎉' : 'In progress...'}</span>
                </div>
                ${milestone.achieved ? '<span class="milestone-check">✓</span>' : ''}
            </div>
        `;
    }
    
    if (html === '') {
        html = '<p class="empty-state">Complete sessions to earn milestones!</p>';
    }
    
    container.innerHTML = html;
}

function renderRecommendations(recommendations) {
    const container = document.getElementById('recommendations-grid');
    if (!container) return;
    
    let html = '';
    
    for (const rec of recommendations) {
        html += `
            <div class="recommendation-card">
                <span class="recommendation-icon">${rec.icon}</span>
                <div class="recommendation-content">
                    <span class="recommendation-area">${rec.area}</span>
                    <p class="recommendation-tip">${rec.tip}</p>
                </div>
            </div>
        `;
    }
    
    if (html === '') {
        html = '<p class="empty-state">Start chatting to receive personalized recommendations!</p>';
    }
    
    container.innerHTML = html;
}

// ==================== DASHBOARD CHART FUNCTIONS ====================

function renderEmotionChart(emotionData) {
    const container = document.getElementById('emotion-chart');
    if (!container) return;
    
    const emotions = {
        happy: { emoji: '😊', color: '#4CAF50', label: 'Happy' },
        sad: { emoji: '😢', color: '#2196F3', label: 'Sad' },
        angry: { emoji: '😠', color: '#f44336', label: 'Angry' },
        scared: { emoji: '😨', color: '#9C27B0', label: 'Scared' },
        excited: { emoji: '🤩', color: '#FF9800', label: 'Excited' },
        calm: { emoji: '😌', color: '#00BCD4', label: 'Calm' }
    };
    
    const total = Object.values(emotionData).reduce((a, b) => a + b, 0) || 1;
    
    let html = '<div class="emotion-bars">';
    
    for (const [emotion, count] of Object.entries(emotionData)) {
        const info = emotions[emotion] || { emoji: '🎭', color: '#666', label: emotion };
        const percentage = Math.round((count / total) * 100);
        
        html += `
            <div class="emotion-bar-item">
                <div class="emotion-bar-label">
                    <span class="emotion-bar-emoji">${info.emoji}</span>
                    <span class="emotion-bar-name">${info.label}</span>
                </div>
                <div class="emotion-bar-track">
                    <div class="emotion-bar-fill" style="width: ${percentage}%; background: ${info.color}"></div>
                </div>
                <span class="emotion-bar-value">${count}</span>
            </div>
        `;
    }
    
    if (Object.keys(emotionData).length === 0) {
        html = '<p class="empty-state">No emotions expressed yet. Encourage using the emotion buttons!</p>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function renderActivityChart(activityData) {
    const container = document.getElementById('activity-chart');
    if (!container) return;
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxActivity = Math.max(...Object.values(activityData), 1);
    
    let html = '<div class="activity-bars">';
    
    for (const day of days) {
        const count = activityData[day] || 0;
        const heightPercent = (count / maxActivity) * 100;
        
        html += `
            <div class="activity-bar-item">
                <div class="activity-bar-track">
                    <div class="activity-bar-fill" style="height: ${heightPercent}%">
                        <span class="activity-bar-count">${count}</span>
                    </div>
                </div>
                <span class="activity-bar-day">${day}</span>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function renderCharacterUsage(usageData) {
    const container = document.getElementById('character-usage');
    if (!container) return;
    
    const sortedChars = Object.entries(usageData).sort((a, b) => b[1] - a[1]);
    
    let html = '';
    
    for (const [charId, count] of sortedChars) {
        const info = CHARACTER_INFO[charId];
        const char = characters[charId];
        if (!info || !char) continue;
        
        html += `
            <div class="character-usage-card">
                <img src="${info.img}" class="character-usage-img" alt="${char.name}">
                <div class="character-usage-info">
                    <span class="character-usage-name">${char.name}</span>
                    <span class="character-usage-count">${count} conversations</span>
                </div>
            </div>
        `;
    }
    
    if (html === '') {
        html = '<p class="empty-state">Start chatting to see your favorite characters!</p>';
    }
    
    container.innerHTML = html;
}

function renderBadgesEarned(badges) {
    const container = document.getElementById('badges-earned-grid');
    if (!container) return;
    
    const allBadges = [
        { name: 'First Words', emoji: '🏅', description: 'Had your first conversation' },
        { name: 'Chatty Friend', emoji: '⭐', description: 'Completed 10 conversations' },
        { name: 'Emotion Expert', emoji: '💬', description: 'Used all emotion buttons' },
        { name: 'Story Master', emoji: '📚', description: 'Created 5 stories with Naveen' },
        { name: 'Problem Solver', emoji: '🧩', description: 'Solved 10 puzzles with Ramanujan' },
        { name: 'Routine Hero', emoji: '🎯', description: 'Completed 5 routines with Rita' }
    ];
    
    let html = '';
    
    for (const badge of allBadges) {
        const earned = badges.some(b => b.badge_name === badge.name);
        
        html += `
            <div class="badge-earned-card ${earned ? 'earned' : 'locked'}">
                <div class="badge-earned-emoji">${badge.emoji}</div>
                <div class="badge-earned-info">
                    <span class="badge-earned-name">${badge.name}</span>
                    <span class="badge-earned-desc">${badge.description}</span>
                </div>
                ${earned ? '<span class="badge-check">✓</span>' : '<span class="badge-lock">🔒</span>'}
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function updateProgressBar(id, value) {
    const bar = document.getElementById(`${id}-bar`);
    const valueEl = document.getElementById(`${id}-value`);
    
    if (bar) {
        const clampedValue = Math.min(Math.max(value, 0), 100);
        bar.style.width = `${clampedValue}%`;
    }
    if (valueEl) {
        valueEl.textContent = typeof value === 'number' ? 
            (value > 10 ? `${Math.round(value)}%` : value.toFixed(1)) : value;
    }
}

function calculateArrayAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function formatAIReport(report) {
    // Convert markdown-style formatting to HTML
    return report
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^(.*)$/, '<p>$1</p>');
}

function formatSessionDate(dateStr) {
    if (!dateStr) return 'Recently';
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    } catch {
        return 'Recently';
    }
}

function backFromDashboard() {
    document.getElementById('parent-dashboard').classList.remove('active');
    document.getElementById('parent-dashboard').style.display = 'none';
    document.getElementById('character-selection').classList.add('active');
    document.getElementById('character-selection').style.display = 'flex';
}

// ==================== CHILD EVALUATION TRACKING ====================

function trackChildMessage(message) {
    const words = message.split(/\s+/).filter(w => w.length > 0);
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Track emotion if selected
    if (selectedEmotion) {
        childEvaluation.emotionTracking.push({
            emotion: selectedEmotion,
            timestamp: Date.now(),
            messageLength: words.length
        });
    }
    
    // Communication skills metrics
    childEvaluation.communicationSkills.clarity += calculateClarity(message);
    childEvaluation.communicationSkills.engagement += words.length > 3 ? 1 : 0;
    childEvaluation.communicationSkills.reciprocity += message.includes('?') ? 1 : 0;
    
    // Maturity indicators
    const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : words.length;
    childEvaluation.maturityIndicators.sentenceComplexity = 
        (childEvaluation.maturityIndicators.sentenceComplexity + avgWordsPerSentence) / 2;
    
    // Vocabulary diversity
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const diversity = words.length > 0 ? uniqueWords.size / words.length : 0;
    childEvaluation.maturityIndicators.vocabularyDiversity = 
        (childEvaluation.maturityIndicators.vocabularyDiversity + diversity) / 2;
    
    // Social metrics - turn taking
    childEvaluation.socialMetrics.turnTaking++;
    
    // Response latency tracking
    const lastAiMessage = chatHistory.filter(m => m.role === 'ai').pop();
    if (lastAiMessage && lastAiMessage.timestamp) {
        const latency = (Date.now() - lastAiMessage.timestamp) / 1000;
        childEvaluation.socialMetrics.responseLatency.push(latency);
    }
    
    // Topic maintenance
    if (chatHistory.length > 0) {
        const lastUserMessage = chatHistory.filter(m => m.role === 'user').pop();
        if (lastUserMessage) {
            const similarity = calculateTopicSimilarity(lastUserMessage.content, message);
            childEvaluation.socialMetrics.topicMaintenance = 
                (childEvaluation.socialMetrics.topicMaintenance + similarity) / 2;
        }
    }
    
    // Save evaluation to storage
    saveEvaluationToStorage();
}

function calculateClarity(message) {
    // Simple clarity score based on structure
    let score = 0;
    if (message.length > 0) score += 1;
    if (message.match(/^[A-Z]/)) score += 1; // Starts with capital
    if (message.match(/[.!?]$/)) score += 1; // Ends with punctuation
    if (message.split(/\s+/).length >= 3) score += 1; // Has at least 3 words
    return score / 4;
}

function calculateTopicSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = [...words1].filter(w => words2.has(w));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? intersection.length / union.size : 0;
}

// ==================== CONTEXT SUMMARY ====================

async function generateContextSummary() {
    console.log('📝 Generating context summary...');
    
    if (chatHistory.length < 4) return;
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/summary/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                child_id: currentChild.id,
                session_id: currentSessionId,
                messages: chatHistory.slice(-8), // Last 8 messages
                character: currentCharacter,
                evaluation: childEvaluation
            })
        });
        
        const data = await response.json();
        
        if (data.summary) {
            contextSummary = data.summary;
            console.log('📝 Summary generated:', contextSummary);
            
            // Show subtle notification
            showSummaryNotification();
        }
    } catch (error) {
        console.error('Error generating summary:', error);
    }
}

function showSummaryNotification() {
    // Create subtle notification that AI is remembering
    const notif = document.createElement('div');
    notif.className = 'summary-notification';
    notif.innerHTML = `
        <span class="summary-icon">🧠</span>
        <span class="summary-text">AI is learning about you...</span>
    `;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.classList.add('fade-out');
        setTimeout(() => notif.remove(), 500);
    }, 2000);
}

// ==================== PERSISTENT STORAGE ====================

function saveChatToStorage() {
    if (!currentChild || !currentSessionId) return;
    
    const storageKey = `neuronarrative_chat_${currentChild.id}_${currentSessionId}`;
    const data = {
        childId: currentChild.id,
        sessionId: currentSessionId,
        character: currentCharacter,
        chatHistory: chatHistory,
        contextSummary: contextSummary,
        messageCount: messageCount,
        savedAt: Date.now()
    };
    
    localStorage.setItem(storageKey, JSON.stringify(data));
    
    // Also save to session index
    saveSessionIndex();
    
    // Sync to backend
    syncToBackend(data);
}

function saveSessionIndex() {
    if (!currentChild) return;
    
    const indexKey = `neuronarrative_sessions_${currentChild.id}`;
    let sessions = JSON.parse(localStorage.getItem(indexKey) || '[]');
    
    const existing = sessions.findIndex(s => s.sessionId === currentSessionId);
    const sessionData = {
        sessionId: currentSessionId,
        character: currentCharacter,
        messageCount: messageCount,
        startedAt: sessions[existing]?.startedAt || Date.now(),
        lastActive: Date.now()
    };
    
    if (existing >= 0) {
        sessions[existing] = sessionData;
    } else {
        sessions.unshift(sessionData);
    }
    
    // Keep only last 50 sessions
    sessions = sessions.slice(0, 50);
    localStorage.setItem(indexKey, JSON.stringify(sessions));
}

function loadChatFromStorage(sessionId) {
    if (!currentChild) return null;
    
    const storageKey = `neuronarrative_chat_${currentChild.id}_${sessionId}`;
    const data = localStorage.getItem(storageKey);
    
    if (data) {
        const parsed = JSON.parse(data);
        chatHistory = parsed.chatHistory || [];
        contextSummary = parsed.contextSummary || '';
        messageCount = parsed.messageCount || 0;
        return parsed;
    }
    return null;
}

function getRecentSessions() {
    if (!currentChild) return [];
    
    const indexKey = `neuronarrative_sessions_${currentChild.id}`;
    return JSON.parse(localStorage.getItem(indexKey) || '[]');
}

async function syncToBackend(data) {
    try {
        await fetch('http://127.0.0.1:5000/api/chat/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (error) {
        console.log('Background sync failed, will retry later');
    }
}

function saveEvaluationToStorage() {
    if (!currentChild) return;
    
    const evalKey = `neuronarrative_eval_${currentChild.id}`;
    let allEvals = JSON.parse(localStorage.getItem(evalKey) || '{}');
    
    allEvals[currentSessionId] = {
        ...childEvaluation,
        timestamp: Date.now(),
        character: currentCharacter
    };
    
    localStorage.setItem(evalKey, JSON.stringify(allEvals));
}

function loadEvaluationFromStorage() {
    if (!currentChild) return null;
    
    const evalKey = `neuronarrative_eval_${currentChild.id}`;
    return JSON.parse(localStorage.getItem(evalKey) || '{}');
}

function resetSessionData() {
    chatHistory = [];
    messageCount = 0;
    contextSummary = '';
    childEvaluation = {
        emotionTracking: [],
        communicationSkills: { clarity: 0, engagement: 0, reciprocity: 0 },
        socialMetrics: { turnTaking: 0, responseLatency: [], topicMaintenance: 0 },
        maturityIndicators: { sentenceComplexity: 0, vocabularyDiversity: 0 }
    };
}

console.log('✅ Script loaded');
