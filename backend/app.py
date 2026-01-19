from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from config import Config
from database import Database
from ollama_service import OllamaService
import os
import time

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
    
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    
    child_id = db.create_child(name, avatar)
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
        'messages': []
    }
    
    return jsonify({
        'session_id': session_id,
        'message': 'Session started'
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

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    child_id = data.get('child_id')
    character = data.get('character')
    message = data.get('message')
    emotion = data.get('emotion')
    session_id = data.get('session_id')
    
    if not all([child_id, character, message]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if not ollama.is_available():
        return jsonify({'error': 'AI service is not available'}), 503
    
    # Get conversation history
    history = db.get_conversations(child_id, limit=5)
    
    # Generate response
    response = ollama.generate_response(character, message, emotion, history)
    
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

# ==================== ANALYTICS ====================

@app.route('/api/analytics/parent/<int:child_id>', methods=['GET'])
def parent_dashboard(child_id):
    child = db.get_child(child_id)
    if not child:
        return jsonify({'error': 'Child not found'}), 404
    
    dashboard = {
        'child_name': child['name'],
        'level': child['level'],
        'xp': child['xp'],
        'streak': child['streak'],
        'total_sessions': 0,
        'total_conversations': len(db.get_conversations(child_id)),
        'avg_turns_per_session': 0,
        'emoji_accuracy': 0,
        'recent_sessions': [],
        'badges': db.get_badges(child_id)
    }
    
    return jsonify(dashboard)

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
