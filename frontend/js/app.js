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

// ==================== CRISIS DETECTION ====================
const CRISIS_KEYWORDS = {
    en: ['hurt myself', 'kill myself', 'want to die', 'suicide', 'end my life', 'nobody loves me', 
         'hate myself', 'run away forever', 'disappear', 'better off without me', 'dont want to live',
         'cut myself', 'harm myself', 'worthless', 'no point living'],
    ta: ['சாகணும்', 'யாருக்கும் வேண்டாம்', 'என்னை வெறுக்கிறேன்', 'ஓடிப்போகணும்'],
    hi: ['मरना चाहता', 'कोई प्यार नहीं', 'खुद को नुकसान']
};

function checkForCrisis(message) {
    const lowerMsg = message.toLowerCase();
    const allKeywords = [...CRISIS_KEYWORDS.en, ...CRISIS_KEYWORDS.ta, ...CRISIS_KEYWORDS.hi];
    
    for (const keyword of allKeywords) {
        if (lowerMsg.includes(keyword.toLowerCase())) {
            showCrisisBanner();
            saveCrisisAlert(message);
            return true;
        }
    }
    return false;
}

function showCrisisBanner() {
    document.getElementById('crisis-banner').classList.remove('hidden');
    // Also add gentle AI response
    setTimeout(() => {
        addMessage("💙 I can see you're having a really hard time. Those feelings are heavy. A grown-up who cares about you can help. Can you tell a parent or teacher how you feel?", 'ai');
    }, 500);
}

function saveCrisisAlert(message) {
    const alerts = JSON.parse(localStorage.getItem('neuronarrative_crisis_alerts') || '[]');
    alerts.push({ 
        message, 
        timestamp: Date.now(), 
        childId: currentChild?.id,
        childName: currentChild?.name,
        character: currentCharacter
    });
    localStorage.setItem('neuronarrative_crisis_alerts', JSON.stringify(alerts));
}

// ==================== AI OPTIONS SYSTEM ====================
async function generateOptions(aiMessage) {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: aiMessage })
        });
        const data = await response.json();
        console.log('Options:', data.options);
        return data.options || [];
    } catch (e) {
        console.error('Options error:', e);
        return [];
    }
}

async function showOptionsPopup() {
    const lastAI = chatHistory.filter(m => m.role === 'ai').pop();
    if (!lastAI) return;
    
    const options = await generateOptions(lastAI.content);
    if (options.length === 0) return;
    
    const popup = document.getElementById('ai-options-popup');
    const container = document.getElementById('options-buttons');
    container.innerHTML = options.slice(0, 2).map(opt => 
        `<button class="option-btn" onclick="selectOption('${opt.replace(/'/g, "\\'")}')">${opt}</button>`
    ).join('');
    popup.classList.remove('hidden');
}

function hideOptionsPopup() {
    document.getElementById('ai-options-popup').classList.add('hidden');
}

function selectOption(text) {
    document.getElementById('message-input').value = text;
    hideOptionsPopup();
    sendMessage();
}

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
    'puffy': { 
        img: '/assets/emma-pufferfish.png',
        emoji: '🐡',
        desc: 'Helps identify and express feelings',
        greeting: "Hi! I'm Puffy. How are you feeling today?",
        emotions: EMOTION_ASSETS
    },
    'ollie': { 
        img: '/assets/sam-octopus.png',
        emoji: '🐙',
        desc: 'Teaches conversation and social skills',
        greeting: "Hi! I'm Ollie. Let's chat and have fun!",
        emotions: EMOTION_ASSETS
    },
    'sheldon': { 
        img: '/assets/steve-turtle.png',
        emoji: '🐢',
        desc: 'Inspires creative storytelling',
        greeting: "Hi! I'm Sheldon. Let's create an amazing story together!",
        emotions: EMOTION_ASSETS
    },
    'clawde': { 
        img: '/assets/pete-crab.png',
        emoji: '🦀',
        desc: 'Teaches problem-solving',
        greeting: "Hi! I'm Clawde. I can help you solve puzzles!",
        emotions: EMOTION_ASSETS
    },
    'finley': {
        img: '/assets/rita-seahorse.png',
        emoji: '🦭',
        desc: 'Helps organize daily routines',
        greeting: "Hi! I'm Finley. I can help you plan your day!",
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
            
            if (img.src.includes('puffy') || img.src.includes('emma')) {
                emoji = '🐡';
            } else if (img.src.includes('ollie') || img.src.includes('sam')) {
                emoji = '🐙';
            } else if (img.src.includes('sheldon') || img.src.includes('steve')) {
                emoji = '🐢';
            } else if (img.src.includes('clawde') || img.src.includes('pete')) {
                emoji = '🦀';
            } else if (img.src.includes('finley') || img.src.includes('rita')) {
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

// Voice settings per character
const CHAR_VOICES = {
    'puffy': { pitch: 1.3, rate: 0.8 },    // Soft, slow, gentle
    'ollie': { pitch: 1.4, rate: 1.1 },    // Cheerful, energetic
    'sheldon': { pitch: 0.8, rate: 0.7 },  // Deep, slow, wise
    'clawde': { pitch: 1.0, rate: 0.9 },   // Clear, steady
    'finley': { pitch: 1.1, rate: 0.85 }   // Calm, organized
};

function speakText(text) {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voiceSettings = CHAR_VOICES[currentCharacter] || { pitch: 1.0, rate: 0.9 };
        utterance.pitch = voiceSettings.pitch;
        utterance.rate = voiceSettings.rate;
        utterance.volume = 1.0;
        
        // Try to match language from text
        const voices = speechSynthesis.getVoices();
        const isTamil = /[\u0B80-\u0BFF]/.test(text);
        const isHindi = /[\u0900-\u097F]/.test(text);
        
        let voice = voices.find(v => isTamil ? v.lang.includes('ta') : isHindi ? v.lang.includes('hi') : v.lang.includes('en'));
        if (voice) utterance.voice = voice;
        
        speechSynthesis.speak(utterance);
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
                    <button class="btn-delete-profile" onclick="event.stopPropagation(); deleteChild(${child.id}, '${child.name}')" title="Delete Profile">×</button>
                    <div class="avatar-large">${child.avatar}</div>
                    <h3>${child.name}</h3>
                    <span class="age-badge">${child.age || '?'} years</span>
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

async function deleteChild(childId, childName) {
    if (!confirm(`Delete ${childName}'s profile? This cannot be undone.`)) return;
    
    try {
        await fetch(`http://127.0.0.1:5000/api/children/${childId}`, { method: 'DELETE' });
        // Clear local storage for this child
        Object.keys(localStorage).forEach(key => {
            if (key.includes(`_${childId}_`) || key.endsWith(`_${childId}`)) {
                localStorage.removeItem(key);
            }
        });
        await loadChildren();
    } catch (error) {
        console.error('❌ Error deleting child:', error);
    }
}

async function createChild() {
    const name = document.getElementById('new-child-name').value.trim();
    const age = document.getElementById('new-child-age').value;
    
    if (!name) { alert('Please enter a name!'); return; }
    if (!age) { alert('Please select age!'); return; }
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, avatar: '👦', age: parseInt(age) })
        });
        
        document.getElementById('new-child-name').value = '';
        document.getElementById('new-child-age').value = '';
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
    
    // Load previous messages for this child+character
    const saved = loadAllChats();
    chatHistory = saved.chatHistory || [];
    contextSummary = saved.contextSummary || '';
    messageCount = saved.messageCount || 0;
    
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
    
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = '';
    
    // Restore previous messages if any
    if (chatHistory.length > 0) {
        chatHistory.forEach(msg => {
            addMessageToUI(msg.content, msg.role === 'ai' ? 'ai' : 'user', msg.emotion);
        });
    } else {
        // First time greeting
        const greeting = info.greeting;
        addMessageToUI(greeting, 'ai');
        chatHistory.push({ role: 'ai', content: greeting, timestamp: Date.now() });
    }
    
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
    hideOptionsPopup();
    
    // Crisis detection
    if (checkForCrisis(message)) {
        input.value = '';
        return; // Don't send to AI, show crisis support instead
    }
    
    resetAntiFreezeTimer();
    
    addMessage(message, 'user', selectedEmotion);
    input.value = '';
    input.style.height = 'auto';
    
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
                context_summary: contextSummary,
                age: currentChild.age || 10
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
        
        // Show AI-generated options immediately
        showOptionsPopup();
        
    } catch (error) {
        console.error('❌ Error:', error);
        removeTyping();
        addMessage('Sorry, something went wrong. Please try again.', 'ai');
    }
}

function addMessageToUI(text, sender, emotion = null, time = null) {
    const container = document.getElementById('chat-messages');
    const info = CHARACTER_INFO[currentCharacter];
    const div = document.createElement('div');
    div.className = `message ${sender}-message`;
    
    const timestamp = time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    let emotionBadge = '';
    if (emotion && sender === 'user') {
        const emotionLabels = { happy: '😊 Happy', sad: '😢 Sad', angry: '😠 Angry', scared: '😨 Scared', excited: '🤩 Excited', calm: '😌 Calm' };
        emotionBadge = `<span class="message-emotion">${emotionLabels[emotion] || ''}</span>`;
    }
    
    if (sender === 'user') {
        div.innerHTML = `<div class="message-avatar">${currentChild?.avatar || '👦'}</div><div class="message-content"><p class="message-bubble">${text}</p>${emotionBadge}<p class="message-timestamp">${timestamp}</p></div>`;
    } else {
        div.innerHTML = `<img src="${info?.img || ''}" class="message-avatar-img" alt=""><div class="message-content"><p class="message-bubble">${text}</p><p class="message-timestamp">${timestamp}</p></div>`;
    }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function addMessage(text, sender, emotion = null) {
    addMessageToUI(text, sender, emotion);
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
    console.log('📊 Opening dashboard in new window...');
    
    // Store child data for dashboard window
    localStorage.setItem('neuronarrative_dashboard_child', JSON.stringify(currentChild));
    localStorage.setItem('neuronarrative_dashboard_characters', JSON.stringify(characters));
    
    // Open dashboard in new window
    const dashWin = window.open('', 'Dashboard', 'width=1200,height=800,scrollbars=yes');
    dashWin.document.write('<html><head><title>Loading Dashboard...</title></head><body style="font-family:Nunito,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:linear-gradient(135deg,#1a5276,#2980b9);color:white;"><h2>🌊 Loading Dashboard...</h2></body></html>');
    
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/analytics/parent/${currentChild.id}`);
        const data = await response.json();
        
        // Build dashboard HTML
        const dashHTML = buildDashboardHTML(data);
        dashWin.document.open();
        dashWin.document.write(dashHTML);
        dashWin.document.close();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        dashWin.document.body.innerHTML = '<h2>Error loading dashboard. Please try again.</h2>';
    }
}

function buildDashboardHTML(data) {
    const child = currentChild;
    return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>📊 ${child.name}'s Progress Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Nunito',sans-serif;background:linear-gradient(135deg,#1a5276 0%,#2980b9 50%,#3498db 100%);min-height:100vh;color:#2c3e50;padding:20px}
.container{max-width:1100px;margin:0 auto}
.header{background:rgba(255,255,255,0.95);border-radius:20px;padding:25px;margin-bottom:20px;display:flex;align-items:center;gap:20px;box-shadow:0 10px 40px rgba(0,0,0,0.2)}
.avatar{font-size:60px;background:linear-gradient(135deg,#667eea,#764ba2);padding:15px;border-radius:50%}
.header h1{font-size:28px;color:#1a5276}
.header p{color:#7f8c8d}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:20px}
.stat-card{background:rgba(255,255,255,0.95);border-radius:15px;padding:20px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.1)}
.stat-value{font-size:36px;font-weight:800;color:#1a5276}
.stat-label{color:#7f8c8d;font-size:14px}
.section{background:rgba(255,255,255,0.95);border-radius:15px;padding:20px;margin-bottom:20px;box-shadow:0 5px 20px rgba(0,0,0,0.1)}
.section h2{color:#1a5276;margin-bottom:15px;font-size:20px}
.progress-item{margin-bottom:12px}
.progress-label{display:flex;justify-content:space-between;margin-bottom:5px;font-size:14px}
.progress-bar{height:12px;background:#ecf0f1;border-radius:6px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,#3498db,#2980b9);border-radius:6px;transition:width 0.5s}
.emotion-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}
.emotion-item{text-align:center;padding:15px;background:#f8f9fa;border-radius:10px}
.emotion-emoji{font-size:30px}
.session-item{display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid #ecf0f1}
.session-item:last-child{border:none}
.badge-grid{display:flex;gap:15px;flex-wrap:wrap}
.badge{width:60px;height:60px;display:flex;align-items:center;justify-content:center;font-size:28px;background:#f8f9fa;border-radius:50%;opacity:0.4}
.badge.earned{opacity:1;background:linear-gradient(135deg,#f1c40f,#f39c12);box-shadow:0 3px 10px rgba(241,196,15,0.4)}
.close-btn{position:fixed;top:20px;right:20px;background:#e74c3c;color:white;border:none;padding:10px 20px;border-radius:25px;cursor:pointer;font-family:inherit;font-weight:600}
.close-btn:hover{background:#c0392b}
</style>
</head><body>
<button class="close-btn" onclick="window.close()">✕ Close</button>
<div class="container">
<div class="header">
<div class="avatar">${child.avatar}</div>
<div><h1>${child.name}'s Progress</h1><p>Level ${data.level || 1} • ${data.xp || 0} XP • 🔥 ${data.streak || 0} Day Streak</p></div>
</div>

<div class="stats-grid">
<div class="stat-card"><div class="stat-value">${data.total_sessions || 0}</div><div class="stat-label">Total Sessions</div></div>
<div class="stat-card"><div class="stat-value">${(data.avg_turns_per_session || 0).toFixed(1)}</div><div class="stat-label">Avg Turns/Session</div></div>
<div class="stat-card"><div class="stat-value">${(data.emoji_accuracy || 0).toFixed(0)}%</div><div class="stat-label">Emotion Expression</div></div>
<div class="stat-card"><div class="stat-value">${data.total_conversations || 0}</div><div class="stat-label">Conversations</div></div>
</div>

<div class="section">
<h2>🎭 Emotion Distribution</h2>
<div class="emotion-grid">
${Object.entries(data.emotion_distribution || {}).map(([e,c]) => `<div class="emotion-item"><div class="emotion-emoji">${{happy:'😊',sad:'😢',angry:'😠',scared:'😨',excited:'🤩',calm:'😌'}[e]||'🎭'}</div><div>${e}: ${c}</div></div>`).join('')}
</div>
</div>

<div class="section">
<h2>🗣️ Communication Progress</h2>
${['clarity','engagement','reciprocity'].map(k => {
    const v = data.communication_progress?.[k] || [];
    const avg = v.length ? (v.reduce((a,b)=>a+b,0)/v.length) : 0;
    return `<div class="progress-item"><div class="progress-label"><span>${k.charAt(0).toUpperCase()+k.slice(1)}</span><span>${avg.toFixed(0)}%</span></div><div class="progress-bar"><div class="progress-fill" style="width:${avg}%"></div></div></div>`;
}).join('')}
</div>

<div class="section">
<h2>📝 Recent Sessions</h2>
${(data.recent_sessions || []).slice(0,5).map(s => `<div class="session-item"><span>${s.character}</span><span>💬 ${s.turn_count||0} turns • ⏱️ ${(s.duration_minutes||0).toFixed(1)} min</span></div>`).join('') || '<p>No sessions yet</p>'}
</div>

<div class="section">
<h2>🏆 Badges</h2>
<div class="badge-grid">
${['First Words','Chatty Friend','Emotion Expert','Story Master','Problem Solver','Routine Hero'].map((name,i) => {
    const earned = (data.badges||[]).some(b => b.badge_name === name);
    return `<div class="badge ${earned?'earned':''}" title="${name}">${['🏅','⭐','💬','📚','🧩','🎯'][i]}</div>`;
}).join('')}
</div>
</div>

${data.ai_report ? `<div class="section"><h2>🌟 AI Progress Report</h2><p>${data.ai_report}</p></div>` : ''}
</div>
</body></html>`;
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
    if (!currentChild || !currentCharacter) return;
    
    // Save per child+character (persistent across sessions)
    const storageKey = `neuronarrative_chat_${currentChild.id}_${currentCharacter}`;
    const data = {
        childId: currentChild.id,
        character: currentCharacter,
        chatHistory: chatHistory,
        contextSummary: contextSummary,
        messageCount: messageCount,
        savedAt: Date.now()
    };
    
    localStorage.setItem(storageKey, JSON.stringify(data));
    saveSessionIndex();
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

function loadAllChats() {
    if (!currentChild || !currentCharacter) return {};
    
    const storageKey = `neuronarrative_chat_${currentChild.id}_${currentCharacter}`;
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : {};
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
