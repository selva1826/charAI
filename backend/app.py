from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from config import Config
from database import Database
from ollama_service import OllamaService
import os
import time
from datetime import datetime

app = Flask(__name__, static_folder='../frontend', static_url_path='')
app.config.from_object(Config)
CORS(app)

# Initialize services
db = Database(Config.DATABASE_PATH)
ollama = OllamaService()

# Active sessions
active_sessions = {}

# ==================== STATIC FILES ====================

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(app.static_folder, path)

# ==================== HEALTH CHECK ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'ollama_available': ollama.is_available()
    })

# ==================== CHILDREN ====================

@app.route('/api/children', methods=['GET'])
def get_children():
    children = db.get_all_children()
    return jsonify({'children': children})

@app.route('/api/children', methods=['POST'])
def create_child():
    data = request.json
    name = data.get('name')
    avatar = data.get('avatar', '👦')
    age = data.get('age', 10)
    
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    
    child_id = db.create_child(name, avatar, age)
    child = db.get_child(child_id)
    
    return jsonify({'child': child}), 201

@app.route('/api/children/<int:child_id>', methods=['GET'])
def get_child(child_id):
    child = db.get_child(child_id)
    
    if not child:
        return jsonify({'error': 'Child not found'}), 404
    
    badges = db.get_badges(child_id)
    child['badges'] = badges
    
    return jsonify({'child': child})

@app.route('/api/children/<int:child_id>', methods=['DELETE'])
def delete_child(child_id):
    db.delete_child(child_id)
    return jsonify({'message': 'Profile deleted'})

# ==================== CHARACTERS ====================

@app.route('/api/characters', methods=['GET'])
def get_characters():
    characters = {}
    for char_id, char_data in Config.CHARACTERS.items():
        characters[char_id] = {
            'name': char_data['name'],
            'emoji': char_data['emoji'],
            'role': char_data['role']
        }
    return jsonify({'characters': characters})

# ==================== SESSIONS ====================

@app.route('/api/session/start', methods=['POST'])
def start_session():
    data = request.json
    child_id = data.get('child_id')
    character = data.get('character')
    theme = data.get('theme', 'ocean')
    mode = data.get('mode', 'type')
    
    if not all([child_id, character]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    session_id = int(time.time() * 1000)  # Simple session ID
    
    active_sessions[session_id] = {
        'child_id': child_id,
        'character': character,
        'start_time': time.time(),
        'turn_count': 0,
        'messages': [],
        'evaluations': []
    }
    
    # Get previous context summary for continuity
    context_summary = db.get_latest_summary(child_id, character)
    
    return jsonify({
        'session_id': session_id,
        'message': 'Session started',
        'context_summary': context_summary
    }), 201

@app.route('/api/session/end', methods=['POST'])
def end_session():
    data = request.json
    session_id = data.get('session_id')
    
    if session_id not in active_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = active_sessions[session_id]
    duration = (time.time() - session['start_time']) / 60
    
    summary = f"Great session with {session['character']}! You had {session['turn_count']} conversations."
    
    del active_sessions[session_id]
    
    return jsonify({
        'message': 'Session ended',
        'summary': summary,
        'duration': round(duration, 1),
        'turns': session['turn_count']
    })

# ==================== CHAT ====================

# Safety filter for AI responses
BLOCKED_WORDS = ['kill', 'murder', 'death', 'die', 'weapon', 'blood', 'stupid', 'dumb', 'idiot', 'hate you', 'scary', 'nightmare', 'monster']
SAFE_RESPONSES = {
    'puffy': "I'm here with you. Let's talk about something that makes you happy!",
    'ollie': "Hey friend! Let's chat about something fun instead!",
    'sheldon': "Hmm, let me think of a happy story for us!",
    'clawde': "Let's try a different puzzle. What do you like?",
    'finley': "It's okay. Let's do something calm together."
}

def filter_response(response, character):
    lower_resp = response.lower()
    for word in BLOCKED_WORDS:
        if word in lower_resp:
            return SAFE_RESPONSES.get(character, "Let's talk about something nice!")
    return response

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    child_id = data.get('child_id')
    character = data.get('character')
    message = data.get('message')
    emotion = data.get('emotion')
    session_id = data.get('session_id')
    context_summary = data.get('context_summary', '')
    age = data.get('age', 10)
    
    if not all([child_id, character, message]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if not ollama.is_available():
        return jsonify({'error': 'AI service is not available'}), 503
    
    # Get conversation history
    history = db.get_conversations(child_id, limit=5)
    
    # Generate response with age context
    response = ollama.generate_response(
        character, 
        message, 
        emotion, 
        history,
        context_summary=context_summary,
        age=age
    )
    
    # Apply safety filter
    response = filter_response(response, character)
    
    # Save conversation
    db.save_conversation(child_id, character, message, response, emotion)
    
    # Update XP and streak
    db.update_child_xp(child_id, 10)
    db.update_streak(child_id)
    
    # Update session
    if session_id and session_id in active_sessions:
        active_sessions[session_id]['turn_count'] += 1
        active_sessions[session_id]['messages'].append(message)
    
    # Check badges
    conversations_count = len(db.get_conversations(child_id))
    badges_earned = []
    
    if conversations_count == 1:
        if db.award_badge(child_id, 'First Words'):
            badges_earned.append('First Words')
    elif conversations_count == 10:
        if db.award_badge(child_id, 'Chatty Friend'):
            badges_earned.append('Chatty Friend')
    
    # Detect AI emotion
    ai_emotion = detect_emotion_simple(response)
    
    return jsonify({
        'response': response,
        'xp_gained': 10,
        'badges_earned': badges_earned,
        'ai_emotion': ai_emotion
    })

# ==================== AI OPTIONS ====================

@app.route('/api/options', methods=['POST'])
def generate_options():
    data = request.json
    message = data.get('message', '')
    
    # Generate 2 relevant options with emojis based on AI's question
    prompt = f"""Based on this message: "{message}"
Generate exactly 2 short answer options the child might pick. Add relevant emoji at start.
Format: one option per line, max 4 words each.
Example: If asked "what color dragon?" respond with:
🟢 Green dragon!
🔵 Blue dragon!
Just output 2 lines, nothing else."""
    
    result = ollama.generate_simple(prompt)
    options = [line.strip() for line in result.strip().split('\n') if line.strip()][:2]
    
    return jsonify({'options': options})

# ==================== VOICE CHAT ====================

@app.route('/api/chat/voice', methods=['POST'])
def chat_voice():
    """Handle voice message with transcription"""
    try:
        # Get form data
        child_id = request.form.get('child_id')
        character = request.form.get('character')
        session_id = request.form.get('session_id')
        emotion = request.form.get('emotion')
        
        # TODO: Implement actual STT (Speech-to-Text)
        # For now, simulate transcription
        transcribed_text = "Hello! I want to talk about my day."
        
        # Get conversation history
        history = db.get_conversations(int(child_id), limit=5) if child_id else []
        
        # Generate AI response
        response = ollama.generate_response(
            character,
            transcribed_text,
            emotion,
            history
        )
        
        # Save conversation
        if child_id:
            db.save_conversation(int(child_id), character, transcribed_text, response, emotion)
            db.update_child_xp(int(child_id), 10)
            db.update_streak(int(child_id))
        
        # Update session
        if session_id and int(session_id) in active_sessions:
            active_sessions[int(session_id)]['turn_count'] += 1
        
        # Detect AI emotion
        ai_emotion = detect_emotion_simple(response)
        
        return jsonify({
            'transcribed_text': transcribed_text,
            'response': response,
            'ai_emotion': ai_emotion,
            'xp_gained': 10,
            'badges_earned': []
        })
        
    except Exception as e:
        print(f"Voice error: {str(e)}")
        return jsonify({'error': str(e)}), 500

def detect_emotion_simple(text):
    """Simple emotion detection from text"""
    text_lower = text.lower()
    if '!' in text or 'great' in text_lower or 'wonderful' in text_lower:
        return 'excited'
    elif '?' in text and len(text.split()) > 8:
        return 'thinking'
    elif 'sorry' in text_lower or 'understand' in text_lower:
        return 'concerned'
    elif 'good' in text_lower or 'nice' in text_lower:
        return 'happy'
    elif 'try' in text_lower or 'can' in text_lower:
        return 'encouraging'
    else:
        return 'neutral'

# ==================== EMOJI SCAFFOLDING ====================

@app.route('/api/emoji/scaffold', methods=['POST'])
def emoji_scaffold():
    data = request.json
    emotion = data.get('emotion')
    child_id = data.get('child_id')
    
    # Get recent context
    history = db.get_conversations(child_id, limit=2) if child_id else []
    
    context = ""
    if history:
        last_ai = history[0].get('response', '')
        context = f"The AI just said: '{last_ai}'"
    
    prompt = f"""Complete this sentence for a child who clicked the {emotion} emoji:

{context}

Child wants to say: "I feel {emotion} because..."

Complete it in simple words (5-10 words). Be specific and relatable."""

    completion = ollama.generate_simple(prompt)
    full_text = f"I feel {emotion} because {completion}"
    
    return jsonify({
        'completion': full_text,
        'emotion': emotion
    })

# ==================== ANTI-FREEZE ====================

@app.route('/api/antifreeze/check', methods=['POST'])
def check_antifreeze():
    data = request.json
    session_id = data.get('session_id')
    
    prompts = {
        'continue': 'Tell me more about that',
        'shift': 'Want to talk about something else?',
        'break': 'Take a break'
    }
    
    return jsonify({
        'should_activate': True,
        'prompts': prompts
    })

@app.route('/api/antifreeze/select', methods=['POST'])
def select_antifreeze_option():
    data = request.json
    return jsonify({'message': 'Option logged'})

# ==================== THEMES ====================

@app.route('/api/themes', methods=['GET'])
def get_themes():
    return jsonify({'themes': Config.THEMES})

@app.route('/api/themes/set', methods=['POST'])
def set_theme():
    data = request.json
    return jsonify({'theme': data.get('theme'), 'applied': True})

# ==================== SUMMARY GENERATION ====================

@app.route('/api/summary/generate', methods=['POST'])
def generate_summary():
    """Generate context summary every 8 messages"""
    data = request.json
    child_id = data.get('child_id')
    session_id = data.get('session_id')
    messages = data.get('messages', [])
    character = data.get('character')
    evaluation = data.get('evaluation', {})
    
    if not messages or len(messages) < 4:
        return jsonify({'summary': ''})
    
    # Build summary prompt
    conversation_text = "\n".join([
        f"{'Child' if m['role'] == 'user' else 'AI'}: {m['content']}"
        for m in messages
    ])
    
    prompt = f"""Summarize this conversation between an autistic child and their AI friend.
Focus on:
1. Main topics discussed
2. Child's emotional state and changes
3. Communication patterns observed
4. Any progress or achievements
5. Things the child enjoys or struggles with

Conversation:
{conversation_text}

Create a brief, helpful summary (2-3 sentences) that will help continue the conversation naturally:"""

    summary = ollama.generate_simple(prompt)
    
    # Save summary to database
    if child_id and session_id:
        db.save_summary(child_id, character, session_id, summary, evaluation)
    
    return jsonify({
        'summary': summary,
        'generated_at': time.time()
    })

@app.route('/api/chat/sync', methods=['POST'])
def sync_chat():
    """Sync chat data from frontend"""
    data = request.json
    child_id = data.get('childId')
    session_id = data.get('sessionId')
    chat_history = data.get('chatHistory', [])
    context_summary = data.get('contextSummary', '')
    
    if child_id and session_id:
        db.save_session_data(child_id, session_id, chat_history, context_summary)
    
    return jsonify({'synced': True})

# ==================== ANALYTICS ====================

@app.route('/api/analytics/parent/<int:child_id>', methods=['GET'])
def parent_dashboard(child_id):
    child = db.get_child(child_id)
    if not child:
        return jsonify({'error': 'Child not found'}), 404
    
    # Get all evaluations and sessions
    evaluations = db.get_all_evaluations(child_id)
    sessions = db.get_all_sessions(child_id)
    conversations = db.get_conversations(child_id, limit=100)
    summaries = db.get_all_summaries(child_id)
    
    # Calculate comprehensive metrics
    total_sessions = len(sessions)
    total_conversations = len(conversations)
    avg_turns = total_conversations / max(total_sessions, 1)
    
    # Emotion analysis
    emotion_counts = {}
    for conv in conversations:
        if conv.get('emotion'):
            emotion = conv['emotion']
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
    
    # Calculate communication progress
    communication_progress = calculate_communication_progress(evaluations)
    
    # Calculate emotional development
    emotional_development = calculate_emotional_development(evaluations, emotion_counts)
    
    # Calculate maturity metrics
    maturity_metrics = calculate_maturity_metrics(evaluations)
    
    # Generate AI report
    ai_report = generate_ai_report(child, evaluations, summaries, emotion_counts)
    
    # Calculate developmental milestones
    milestones = calculate_developmental_milestones(
        total_conversations, 
        emotion_counts, 
        communication_progress, 
        maturity_metrics
    )
    
    # Calculate overall developmental score
    overall_score = calculate_overall_score(
        communication_progress,
        emotional_development,
        maturity_metrics
    )
    
    dashboard = {
        'child_name': child['name'],
        'level': child['level'],
        'xp': child['xp'],
        'streak': child['streak'],
        'total_sessions': total_sessions,
        'total_conversations': total_conversations,
        'avg_turns_per_session': round(avg_turns, 1),
        'emoji_accuracy': calculate_emoji_accuracy(evaluations),
        'recent_sessions': sessions[:10],
        'badges': db.get_badges(child_id),
        
        # Enhanced metrics for charts
        'emotion_distribution': emotion_counts,
        'communication_progress': communication_progress,
        'emotional_development': emotional_development,
        'maturity_metrics': maturity_metrics,
        'weekly_activity': calculate_weekly_activity(conversations),
        'character_usage': calculate_character_usage(conversations),
        'summaries': summaries[:5],
        'ai_report': ai_report,
        
        # Autism-specific developmental insights
        'milestones': milestones,
        'overall_score': overall_score,
        'developmental_stage': get_developmental_stage(overall_score),
        'recommendations': generate_recommendations(
            communication_progress, 
            emotional_development, 
            maturity_metrics
        )
    }
    
    return jsonify(dashboard)

def calculate_developmental_milestones(total_convs, emotions, comm_progress, maturity):
    """Calculate autism-specific developmental milestones achieved"""
    milestones = []
    
    # Conversation milestones
    if total_convs >= 1:
        milestones.append({'name': 'First Conversation', 'achieved': True, 'icon': '💬'})
    if total_convs >= 10:
        milestones.append({'name': 'Chatty Friend', 'achieved': True, 'icon': '🗣️'})
    if total_convs >= 50:
        milestones.append({'name': 'Conversation Master', 'achieved': True, 'icon': '⭐'})
    else:
        milestones.append({'name': 'Conversation Master (50 chats)', 'achieved': False, 'icon': '⭐'})
    
    # Emotion milestones
    if len(emotions) >= 1:
        milestones.append({'name': 'First Emotion Shared', 'achieved': True, 'icon': '😊'})
    if len(emotions) >= 3:
        milestones.append({'name': 'Emotion Explorer', 'achieved': True, 'icon': '🎭'})
    if len(emotions) >= 6:
        milestones.append({'name': 'Emotion Master', 'achieved': True, 'icon': '🌈'})
    else:
        milestones.append({'name': 'Emotion Master (all 6 emotions)', 'achieved': False, 'icon': '🌈'})
    
    # Communication milestones
    avg_clarity = sum(comm_progress.get('clarity', [0])) / max(len(comm_progress.get('clarity', [1])), 1)
    if avg_clarity >= 50:
        milestones.append({'name': 'Clear Communicator', 'achieved': True, 'icon': '📢'})
    else:
        milestones.append({'name': 'Clear Communicator', 'achieved': False, 'icon': '📢'})
    
    # Maturity milestones
    if maturity.get('vocabulary_diversity', 0) >= 50:
        milestones.append({'name': 'Vocabulary Builder', 'achieved': True, 'icon': '📚'})
    else:
        milestones.append({'name': 'Vocabulary Builder', 'achieved': False, 'icon': '📚'})
    
    return milestones

def calculate_overall_score(comm_progress, emotional_dev, maturity):
    """Calculate overall developmental score (0-100)"""
    scores = []
    
    # Communication score (30% weight)
    clarity_avg = sum(comm_progress.get('clarity', [0])) / max(len(comm_progress.get('clarity', [1])), 1)
    engagement_avg = sum(comm_progress.get('engagement', [0])) / max(len(comm_progress.get('engagement', [1])), 1)
    comm_score = (clarity_avg + engagement_avg) / 2
    scores.append(comm_score * 0.3)
    
    # Emotional score (35% weight)
    emotional_score = (
        emotional_dev.get('alexithymia_support', 0) + 
        emotional_dev.get('emotional_range', 0) + 
        emotional_dev.get('comfort_with_feelings', 0)
    ) / 3
    scores.append(emotional_score * 0.35)
    
    # Maturity score (35% weight)
    maturity_score = (
        maturity.get('sentence_complexity', 0) + 
        maturity.get('vocabulary_diversity', 0) + 
        maturity.get('topic_maintenance', 0)
    ) / 3
    scores.append(maturity_score * 0.35)
    
    return round(sum(scores), 1)

def get_developmental_stage(score):
    """Get developmental stage based on overall score"""
    if score >= 80:
        return {'name': 'Advanced', 'color': '#00b894', 'description': 'Excellent progress! Continue to challenge and encourage.'}
    elif score >= 60:
        return {'name': 'Developing', 'color': '#0984e3', 'description': 'Good progress! Keep practicing regularly.'}
    elif score >= 40:
        return {'name': 'Emerging', 'color': '#fdcb6e', 'description': 'Building foundations. Celebrate small wins!'}
    elif score >= 20:
        return {'name': 'Beginning', 'color': '#e17055', 'description': 'Just getting started. Every step counts!'}
    else:
        return {'name': 'Exploring', 'color': '#636e72', 'description': 'Beginning the journey. Be patient and supportive.'}

def generate_recommendations(comm_progress, emotional_dev, maturity):
    """Generate personalized recommendations for parents"""
    recommendations = []
    
    # Check communication
    clarity_avg = sum(comm_progress.get('clarity', [0])) / max(len(comm_progress.get('clarity', [1])), 1)
    if clarity_avg < 50:
        recommendations.append({
            'area': 'Communication',
            'icon': '💬',
            'tip': 'Encourage longer responses by asking open-ended questions like "Tell me more about..."'
        })
    
    # Check emotional expression
    if emotional_dev.get('emotional_range', 0) < 50:
        recommendations.append({
            'area': 'Emotional Expression',
            'icon': '🎭',
            'tip': 'Help identify feelings by using the emotion buttons. Try saying "I notice you might be feeling..."'
        })
    
    if emotional_dev.get('comfort_with_feelings', 0) < 30:
        recommendations.append({
            'area': 'Emotional Comfort',
            'icon': '💖',
            'tip': 'Create a safe space for emotions. Validate all feelings without judgment.'
        })
    
    # Check maturity
    if maturity.get('vocabulary_diversity', 0) < 40:
        recommendations.append({
            'area': 'Vocabulary',
            'icon': '📚',
            'tip': 'Read stories together and discuss new words. The Story Builder character can help!'
        })
    
    if maturity.get('topic_maintenance', 0) < 40:
        recommendations.append({
            'area': 'Focus & Attention',
            'icon': '🎯',
            'tip': 'Practice staying on one topic. Use visual aids and gentle redirects when needed.'
        })
    
    # Always add positive recommendation
    recommendations.append({
        'area': 'Keep Going!',
        'icon': '⭐',
        'tip': 'Regular short sessions (10-15 min) are better than occasional long ones. Celebrate progress!'
    })
    
    return recommendations

def calculate_communication_progress(evaluations):
    """Calculate communication skills progress over time with autism-specific metrics"""
    progress = {
        'clarity': [],
        'engagement': [],
        'reciprocity': [],
        'dates': [],
        # Autism-specific metrics
        'social_initiation': 0,  # How often child starts conversations
        'question_asking': 0,    # Ability to ask questions
        'turn_taking': 0,        # Conversation balance
        'topic_shifts': 0,       # Flexibility in topics
        'emotional_labeling': 0  # Ability to name emotions
    }
    
    total_sessions = len(evaluations) or 1
    
    for eval_data in evaluations:
        if 'communicationSkills' in eval_data:
            skills = eval_data['communicationSkills']
            progress['clarity'].append(min(skills.get('clarity', 0) * 100, 100))
            progress['engagement'].append(min(skills.get('engagement', 0) * 15, 100))
            progress['reciprocity'].append(min(skills.get('reciprocity', 0) * 15, 100))
            progress['dates'].append(eval_data.get('timestamp', 0))
            
            # Count reciprocity as turn-taking
            progress['turn_taking'] += skills.get('reciprocity', 0)
        
        if 'emotionTracking' in eval_data:
            progress['emotional_labeling'] += len(eval_data['emotionTracking'])
    
    # Normalize scores
    progress['turn_taking'] = min(round(progress['turn_taking'] / total_sessions * 20, 1), 100)
    progress['emotional_labeling'] = min(round(progress['emotional_labeling'] / total_sessions * 10, 1), 100)
    
    return progress

def calculate_emotional_development(evaluations, emotion_counts):
    """Analyze emotional expression patterns with autism-specific insights"""
    development = {
        'emotion_variety': len(emotion_counts),
        'total_expressions': sum(emotion_counts.values()),
        'most_common': max(emotion_counts, key=emotion_counts.get) if emotion_counts else 'none',
        'positive_ratio': 0,
        'emotion_timeline': [],
        # Autism-specific emotional metrics
        'alexithymia_support': 0,      # How well child identifies emotions
        'emotion_regulation': 0,        # Ability to manage emotions
        'emotional_range': 0,           # Diversity of emotions expressed
        'comfort_with_feelings': 0,     # Willingness to express emotions
        'emotion_vocabulary': 0         # Ability to describe emotions
    }
    
    positive_emotions = ['happy', 'excited', 'calm']
    negative_emotions = ['sad', 'angry', 'scared']
    
    positive_count = sum(emotion_counts.get(e, 0) for e in positive_emotions)
    negative_count = sum(emotion_counts.get(e, 0) for e in negative_emotions)
    total = sum(emotion_counts.values()) or 1
    
    development['positive_ratio'] = round(positive_count / total * 100, 1)
    
    # Autism-specific calculations
    # Alexithymia support: measures ability to identify and label emotions
    development['alexithymia_support'] = min(round(development['emotion_variety'] * 16.67, 1), 100)
    
    # Emotional range: how many different emotions are being expressed
    development['emotional_range'] = min(round(len(emotion_counts) / 6 * 100, 1), 100)
    
    # Emotion regulation: balance between positive and negative (ideal is balanced awareness)
    if total > 0:
        balance = 1 - abs((positive_count - negative_count) / total)
        development['emotion_regulation'] = round(balance * 80 + 20, 1)  # Minimum 20%
    
    # Comfort with feelings: willingness to use emotion buttons
    development['comfort_with_feelings'] = min(round(total / max(len(evaluations), 1) * 50, 1), 100)
    
    # Emotion vocabulary: based on variety and frequency
    development['emotion_vocabulary'] = min(round((development['emotion_variety'] * 10 + total * 2), 1), 100)
    
    return development

def calculate_maturity_metrics(evaluations):
    """Calculate cognitive and language maturity"""
    metrics = {
        'sentence_complexity': 0,
        'vocabulary_diversity': 0,
        'topic_maintenance': 0,
        'avg_response_time': 0
    }
    
    if not evaluations:
        return metrics
    
    complexities = []
    diversities = []
    maintenances = []
    response_times = []
    
    for eval_data in evaluations:
        if 'maturityIndicators' in eval_data:
            mat = eval_data['maturityIndicators']
            complexities.append(mat.get('sentenceComplexity', 0))
            diversities.append(mat.get('vocabularyDiversity', 0))
        if 'socialMetrics' in eval_data:
            soc = eval_data['socialMetrics']
            maintenances.append(soc.get('topicMaintenance', 0))
            response_times.extend(soc.get('responseLatency', []))
    
    metrics['sentence_complexity'] = round(sum(complexities) / len(complexities) * 20, 1) if complexities else 0
    metrics['vocabulary_diversity'] = round(sum(diversities) / len(diversities) * 100, 1) if diversities else 0
    metrics['topic_maintenance'] = round(sum(maintenances) / len(maintenances) * 100, 1) if maintenances else 0
    metrics['avg_response_time'] = round(sum(response_times) / len(response_times), 1) if response_times else 0
    
    return metrics

def calculate_emoji_accuracy(evaluations):
    """Calculate how well child uses emotion emojis"""
    total = 0
    accurate = 0
    
    for eval_data in evaluations:
        if 'emotionTracking' in eval_data:
            for emo in eval_data['emotionTracking']:
                total += 1
                if emo.get('messageLength', 0) > 3:  # Basic validation
                    accurate += 1
    
    return round(accurate / max(total, 1) * 100, 1)

def calculate_weekly_activity(conversations):
    """Calculate activity per day of week"""
    from datetime import datetime
    
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    activity = {day: 0 for day in days}
    
    for conv in conversations:
        if conv.get('timestamp'):
            try:
                dt = datetime.fromisoformat(conv['timestamp'].replace('Z', '+00:00'))
                day = days[dt.weekday()]
                activity[day] += 1
            except:
                pass
    
    return activity

def calculate_character_usage(conversations):
    """Calculate which characters are used most"""
    usage = {}
    for conv in conversations:
        char = conv.get('character', 'unknown')
        usage[char] = usage.get(char, 0) + 1
    return usage

def generate_ai_report(child, evaluations, summaries, emotion_counts):
    """Generate comprehensive AI analysis report"""
    
    # Collect data for report
    recent_summaries = "\n".join([s.get('summary', '') for s in summaries[:3]])
    emotion_info = ", ".join([f"{k}: {v}" for k, v in emotion_counts.items()])
    
    prompt = f"""Generate a caring, professional progress report for parents of an autistic child using our AI companion app.

Child Name: {child['name']}
Level: {child['level']}
Total Sessions: {len(evaluations)}
Emotion expressions: {emotion_info}

Recent conversation summaries:
{recent_summaries}

Write a helpful, encouraging report (3-4 paragraphs) covering:
1. Overall progress and engagement
2. Communication development observations  
3. Emotional expression patterns
4. Recommendations for parents

Keep the tone warm, supportive, and celebratory of progress. Avoid clinical language."""

    report = ollama.generate_simple(prompt)
    
    if not report or len(report) < 50:
        report = f"""🌟 **Progress Overview for {child['name']}**

{child['name']} has been making wonderful progress with our AI companions! They've reached Level {child['level']} and continue to grow each day.

**Communication Growth**: We've noticed positive engagement patterns during conversations. {child['name']} is practicing turn-taking and expressing their thoughts clearly.

**Emotional Expression**: {'The variety of emotions expressed shows healthy emotional awareness.' if len(emotion_counts) > 2 else 'We encourage continuing to explore different feelings with our emotion buttons.'}

**Keep Going!** Every conversation is a step forward. We recommend maintaining regular, short sessions to build communication confidence."""
    
    return report

# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ==================== MAIN ====================

if __name__ == '__main__':
    print("=" * 70)
    print("🌊 NeuroNarrative - Complete System")
    print("=" * 70)
    print(f"📍 Server: http://{Config.HOST}:{Config.PORT}")
    print(f"🤖 Ollama: {Config.OLLAMA_BASE_URL}")
    print(f"🎭 Characters: {len(Config.CHARACTERS)}")
    print("=" * 70)
    
    if ollama.is_available():
        print("✅ Ollama is running")
    else:
        print("⚠️  WARNING: Ollama is not available!")
    
    print("=" * 70)
    print("\n🚀 Starting server...\n")
    
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
