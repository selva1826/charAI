"""
Anti-Freeze Mechanism: Adaptive Continuity Prompting
Prevents conversation abandonment when child pauses
"""

import time
from typing import List, Dict

class AntiFreezeSystem:
    def __init__(self, timeout: int = 15):
        self.timeout = timeout
        self.last_interaction = None
        self.conversation_history = []
        
    def update_interaction(self):
        """Update last interaction timestamp"""
        self.last_interaction = time.time()
        
    def check_timeout(self) -> bool:
        """Check if inactivity timeout reached"""
        if not self.last_interaction:
            return False
        return (time.time() - self.last_interaction) > self.timeout
    
    def generate_continuity_prompts(self, 
                                    conversation_history: List[Dict],
                                    character: str,
                                    special_interests: List[str] = None) -> Dict[str, str]:
        """
        Generate 3 contextual continuity options
        
        Returns:
            {
                'continue': "Tell me more about [topic]",
                'shift': "Do you want to talk about [interest]?",
                'break': "I think you need a break. Let's chat later."
            }
        """
        
        # Extract last topic from conversation
        last_topic = "that"
        if conversation_history and len(conversation_history) > 0:
            last_message = conversation_history[-1].get('message', '')
            # Simple keyword extraction (in production, use NLP)
            words = last_message.lower().split()
            nouns = [w for w in words if len(w) > 4]  # Simple heuristic
            if nouns:
                last_topic = nouns[0]
        
        # Generate options
        options = {
            'continue': f"Tell me more about {last_topic}",
            'shift': self._generate_shift_option(special_interests),
            'break': "I think you need a break. Let's chat later. 😊"
        }
        
        return options
    
    def _generate_shift_option(self, special_interests: List[str] = None) -> str:
        """Generate topic shift option based on special interests"""
        if special_interests and len(special_interests) > 0:
            interest = special_interests[0]
            return f"Do you want to talk about {interest} instead?"
        else:
            # Default alternatives
            alternatives = [
                "Would you like to talk about something else?",
                "Should we try a different topic?",
                "Want to change what we're talking about?"
            ]
            import random
            return random.choice(alternatives)
