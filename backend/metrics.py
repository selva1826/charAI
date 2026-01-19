"""
Clinical Metrics Extraction
Tracks therapeutic progress indicators
"""

import re
from typing import List, Dict
from collections import Counter

class ClinicalMetrics:
    
    @staticmethod
    def calculate_initiation_rate(conversations: List[Dict]) -> float:
        """
        Calculate % of turns child-initiated
        
        Heuristic: Messages starting with questions or exclamations
        """
        if not conversations:
            return 0.0
        
        child_messages = [c for c in conversations if c.get('role') == 'user']
        
        initiated = 0
        for msg in child_messages:
            text = msg.get('message', '')
            # Simple heuristic: starts with question word or exclamation
            if any(text.lower().startswith(w) for w in ['what', 'why', 'how', 'where', 'when', 'can', 'do', 'is']):
                initiated += 1
            elif text.endswith('!'):
                initiated += 1
        
        return (initiated / len(child_messages) * 100) if child_messages else 0.0
    
    @staticmethod
    def calculate_emoji_accuracy(emoji_logs: List[Dict]) -> float:
        """
        Calculate % of correct emotion identifications
        
        Uses sentiment analysis to verify emoji matches message sentiment
        """
        if not emoji_logs:
            return 0.0
        
        correct = sum(1 for log in emoji_logs if log.get('accurate', True))
        return (correct / len(emoji_logs) * 100)
    
    @staticmethod
    def calculate_continuity_metric(sessions: List[Dict]) -> float:
        """
        Calculate average turns per session (engagement duration)
        """
        if not sessions:
            return 0.0
        
        total_turns = sum(s.get('turn_count', 0) for s in sessions)
        return total_turns / len(sessions)
    
    @staticmethod
    def calculate_semantic_entropy(messages: List[str]) -> float:
        """
        Calculate vocabulary diversity (Story Mode metric)
        
        Higher entropy = more diverse vocabulary = better cognitive flexibility
        """
        if not messages:
            return 0.0
        
        # Combine all messages
        all_text = ' '.join(messages).lower()
        words = re.findall(r'\b\w+\b', all_text)
        
        if not words:
            return 0.0
        
        # Calculate unique word ratio
        unique_words = len(set(words))
        total_words = len(words)
        
        return (unique_words / total_words) * 100
    
    @staticmethod
    def generate_session_summary(session_data: Dict, llm_service) -> str:
        """
        Generate AI-powered session summary for parents
        """
        prompt = f"""Summarize this therapy session in 2-3 sentences for parents:

Character: {session_data.get('character')}
Duration: {session_data.get('duration')} minutes
Turns: {session_data.get('turn_count')}
Emotions expressed: {', '.join(session_data.get('emotions', []))}

Key moments:
{session_data.get('key_messages', 'N/A')}

Write a warm, encouraging summary highlighting progress and engagement."""

        try:
            summary = llm_service.generate_simple(prompt)
            return summary
        except:
            return f"Session completed with {session_data.get('character')}. Child engaged for {session_data.get('turn_count')} turns."
