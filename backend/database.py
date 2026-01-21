import sqlite3
import json
from datetime import datetime

class Database:
    def __init__(self, db_path='autism_ai.db'):
        self.db_path = db_path
        self.init_db()
    
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_db(self):
        """Initialize database tables"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Children table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS children (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                avatar TEXT,
                level INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0,
                streak INTEGER DEFAULT 0,
                last_activity DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Conversations table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                child_id INTEGER,
                character TEXT NOT NULL,
                message TEXT NOT NULL,
                response TEXT NOT NULL,
                emotion TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (child_id) REFERENCES children(id)
            )
        ''')
        
        # Badges table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS badges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                child_id INTEGER,
                badge_name TEXT NOT NULL,
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (child_id) REFERENCES children(id)
            )
        ''')
        
        


        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                child_id INTEGER,
                character TEXT NOT NULL,
                theme TEXT DEFAULT 'ocean',
                mode TEXT DEFAULT 'type',
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                turn_count INTEGER DEFAULT 0,
                duration_minutes REAL DEFAULT 0,
                FOREIGN KEY (child_id) REFERENCES children(id)
            )
        ''')

        # Anti-Freeze logs
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS anti_freeze_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                option_chosen TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        ''')

        # Emoji usage logs
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS emoji_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                emotion TEXT,
                accurate BOOLEAN DEFAULT 1,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        ''')

        # Context summaries table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS summaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                child_id INTEGER,
                character TEXT,
                session_id INTEGER,
                summary TEXT,
                evaluation_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (child_id) REFERENCES children(id)
            )
        ''')

        # Child evaluations table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                child_id INTEGER,
                session_id INTEGER,
                character TEXT,
                evaluation_data TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (child_id) REFERENCES children(id)
            )
        ''')

        # Session chat data
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS session_chats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                child_id INTEGER,
                session_id INTEGER,
                chat_history TEXT,
                context_summary TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (child_id) REFERENCES children(id)
            )
        ''')

        conn.commit()
        conn.close()


    
    # Child operations
    def create_child(self, name, avatar):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO children (name, avatar) VALUES (?, ?)',
            (name, avatar)
        )
        conn.commit()
        child_id = cursor.lastrowid
        conn.close()
        return child_id
    
    def get_child(self, child_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM children WHERE id = ?', (child_id,))
        child = cursor.fetchone()
        conn.close()
        return dict(child) if child else None
    
    def get_all_children(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM children ORDER BY created_at DESC')
        children = cursor.fetchall()
        conn.close()
        return [dict(child) for child in children]
    
    def update_child_xp(self, child_id, xp_gain):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE children SET xp = xp + ? WHERE id = ?',
            (xp_gain, child_id)
        )
        conn.commit()
        conn.close()
    
    def update_streak(self, child_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Check last activity
        cursor.execute('SELECT last_activity, streak FROM children WHERE id = ?', (child_id,))
        result = cursor.fetchone()
        
        if result:
            last_activity = result[0]
            current_streak = result[1]
            today = datetime.now().date()
            
            if last_activity:
                last_date = datetime.strptime(last_activity, '%Y-%m-%d').date()
                if (today - last_date).days == 1:
                    # Continue streak
                    current_streak += 1
                elif (today - last_date).days > 1:
                    # Reset streak
                    current_streak = 1
            else:
                current_streak = 1
            
            cursor.execute(
                'UPDATE children SET streak = ?, last_activity = ? WHERE id = ?',
                (current_streak, today.strftime('%Y-%m-%d'), child_id)
            )
        
        conn.commit()
        conn.close()
    
    # Conversation operations
    def save_conversation(self, child_id, character, message, response, emotion=None):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO conversations (child_id, character, message, response, emotion) VALUES (?, ?, ?, ?, ?)',
            (child_id, character, message, response, emotion)
        )
        conn.commit()
        conn.close()
    
    def get_conversations(self, child_id, limit=50):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            'SELECT * FROM conversations WHERE child_id = ? ORDER BY timestamp DESC LIMIT ?',
            (child_id, limit)
        )
        conversations = cursor.fetchall()
        conn.close()
        return [dict(conv) for conv in conversations]
    
    # Badge operations
    def award_badge(self, child_id, badge_name):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Check if already earned
        cursor.execute(
            'SELECT id FROM badges WHERE child_id = ? AND badge_name = ?',
            (child_id, badge_name)
        )
        if cursor.fetchone():
            conn.close()
            return False
        
        cursor.execute(
            'INSERT INTO badges (child_id, badge_name) VALUES (?, ?)',
            (child_id, badge_name)
        )
        conn.commit()
        conn.close()
        return True
    
    def get_badges(self, child_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            'SELECT badge_name, earned_at FROM badges WHERE child_id = ?',
            (child_id,)
        )
        badges = cursor.fetchall()
        conn.close()
        return [dict(badge) for badge in badges]
    
    # Add to existing Database class

    def create_session(self, child_id, character, theme='ocean', mode='type'):
        """Create new therapy session"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO sessions (child_id, character, theme, mode, start_time)
            VALUES (?, ?, ?, ?, datetime('now'))
        ''', (child_id, character, theme, mode))
        conn.commit()
        session_id = cursor.lastrowid
        conn.close()
        return session_id

    def end_session(self, session_id, turn_count, duration_minutes):
        """End therapy session"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE sessions 
            SET end_time = datetime('now'),
                turn_count = ?,
                duration_minutes = ?
            WHERE id = ?
        ''', (turn_count, duration_minutes, session_id))
        conn.commit()
        conn.close()

    def log_anti_freeze_activation(self, session_id, option_chosen):
        """Log when anti-freeze mechanism activates"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO anti_freeze_logs (session_id, option_chosen, timestamp)
            VALUES (?, ?, datetime('now'))
        ''', (session_id, option_chosen))
        conn.commit()
        conn.close()

    def log_emoji_usage(self, session_id, emotion, accuracy):
        """Log emoji scaffolding usage"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO emoji_logs (session_id, emotion, accurate, timestamp)
            VALUES (?, ?, ?, datetime('now'))
        ''', (session_id, emotion, accuracy))
        conn.commit()
        conn.close()

    def get_clinical_metrics(self, child_id):
        """Get clinical metrics for dashboards"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Get all sessions
        cursor.execute('''
            SELECT * FROM sessions WHERE child_id = ? ORDER BY start_time DESC
        ''', (child_id,))
        sessions = [dict(s) for s in cursor.fetchall()]
        
        # Get emoji logs
        cursor.execute('''
            SELECT * FROM emoji_logs 
            WHERE session_id IN (SELECT id FROM sessions WHERE child_id = ?)
        ''', (child_id,))
        emoji_logs = [dict(e) for e in cursor.fetchall()]
        
        conn.close()
        
        return {
            'sessions': sessions,
            'emoji_logs': emoji_logs
        }

    # ==================== SUMMARY OPERATIONS ====================
    
    def save_summary(self, child_id, character, session_id, summary, evaluation=None):
        """Save context summary"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO summaries (child_id, character, session_id, summary, evaluation_data)
            VALUES (?, ?, ?, ?, ?)
        ''', (child_id, character, session_id, summary, json.dumps(evaluation) if evaluation else None))
        conn.commit()
        conn.close()
    
    def get_latest_summary(self, child_id, character):
        """Get most recent summary for a child-character pair"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT summary FROM summaries 
            WHERE child_id = ? AND character = ?
            ORDER BY created_at DESC LIMIT 1
        ''', (child_id, character))
        result = cursor.fetchone()
        conn.close()
        return result['summary'] if result else None
    
    def get_all_summaries(self, child_id):
        """Get all summaries for a child"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM summaries WHERE child_id = ?
            ORDER BY created_at DESC
        ''', (child_id,))
        summaries = [dict(s) for s in cursor.fetchall()]
        conn.close()
        return summaries

    # ==================== EVALUATION OPERATIONS ====================
    
    def save_evaluation(self, child_id, session_id, character, evaluation_data):
        """Save child evaluation data"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO evaluations (child_id, session_id, character, evaluation_data)
            VALUES (?, ?, ?, ?)
        ''', (child_id, session_id, character, json.dumps(evaluation_data)))
        conn.commit()
        conn.close()
    
    def get_all_evaluations(self, child_id):
        """Get all evaluations for a child"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM evaluations WHERE child_id = ?
            ORDER BY timestamp DESC
        ''', (child_id,))
        evaluations = cursor.fetchall()
        conn.close()
        
        result = []
        for e in evaluations:
            eval_dict = dict(e)
            if eval_dict.get('evaluation_data'):
                try:
                    eval_dict.update(json.loads(eval_dict['evaluation_data']))
                except:
                    pass
            result.append(eval_dict)
        
        return result

    # ==================== SESSION DATA OPERATIONS ====================
    
    def save_session_data(self, child_id, session_id, chat_history, context_summary):
        """Save session chat data"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Check if exists
        cursor.execute('''
            SELECT id FROM session_chats WHERE child_id = ? AND session_id = ?
        ''', (child_id, session_id))
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute('''
                UPDATE session_chats 
                SET chat_history = ?, context_summary = ?, updated_at = datetime('now')
                WHERE child_id = ? AND session_id = ?
            ''', (json.dumps(chat_history), context_summary, child_id, session_id))
        else:
            cursor.execute('''
                INSERT INTO session_chats (child_id, session_id, chat_history, context_summary)
                VALUES (?, ?, ?, ?)
            ''', (child_id, session_id, json.dumps(chat_history), context_summary))
        
        conn.commit()
        conn.close()
    
    def get_session_data(self, child_id, session_id):
        """Get session chat data"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM session_chats WHERE child_id = ? AND session_id = ?
        ''', (child_id, session_id))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            data = dict(result)
            if data.get('chat_history'):
                data['chat_history'] = json.loads(data['chat_history'])
            return data
        return None

    def get_all_sessions(self, child_id):
        """Get all sessions for a child"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM sessions WHERE child_id = ?
            ORDER BY start_time DESC
        ''', (child_id,))
        sessions = [dict(s) for s in cursor.fetchall()]
        conn.close()
        return sessions

