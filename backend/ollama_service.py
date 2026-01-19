import requests
import json
from config import Config

class OllamaService:
    def __init__(self):
        self.base_url = Config.OLLAMA_BASE_URL
        self.model = Config.OLLAMA_MODEL
        self.timeout = Config.OLLAMA_TIMEOUT
    
    def is_available(self):
        """Check if Ollama is running"""
        try:
            response = requests.get(f'{self.base_url}/api/tags', timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def generate_response(self, character_id, user_message, emotion=None, 
                         conversation_history=None, model=None):
        """Generate AI response using Ollama with language-specific model"""
        
        # Use specified model or default
        model_to_use = model or self.model
        
        # Get character config
        character = Config.CHARACTERS.get(character_id)
        if not character:
            return "I'm not sure who I am. Please try again!"
        
        # Build prompt
        system_prompt = character['system_prompt']
        
        # Add emotion context if provided
        if emotion:
            emotion_context = f"\n\nThe child is feeling: {emotion}"
            system_prompt += emotion_context
        
        # Build conversation context
        context = ""
        if conversation_history and len(conversation_history) > 0:
            context = "\n\nRecent conversation:\n"
            for conv in conversation_history[-3:]:  # Last 3 messages
                context += f"Child: {conv.get('message', '')}\n"
                context += f"You: {conv.get('response', '')}\n"
        
        full_prompt = f"{system_prompt}{context}\n\nChild: {user_message}\n\nYou:"
        
        try:
            # Call Ollama API
            response = requests.post(
                f'{self.base_url}/api/generate',
                json={
                    'model': model_to_use,
                    'prompt': full_prompt,
                    'stream': False,
                    'options': {
                        'temperature': 0.7,
                        'top_p': 0.9,
                        'max_tokens': 100
                    }
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get('response', '').strip()
                
                # Ensure response is short (max 2-3 sentences)
                sentences = ai_response.split('. ')
                if len(sentences) > 2:
                    ai_response = '. '.join(sentences[:2]) + '.'
                
                return ai_response
            else:
                return "I'm having trouble thinking right now. Can you try again?"
        
        except requests.exceptions.Timeout:
            return "I need more time to think. Please try again."
        except Exception as e:
            print(f"Ollama error: {str(e)}")
            return "Something went wrong. Let's try that again!"
    
    def generate_simple(self, prompt):
        """Generate simple completion (for emoji scaffolding, summaries)"""
        try:
            response = requests.post(
                f'{self.base_url}/api/generate',
                json={
                    'model': self.model,
                    'prompt': prompt,
                    'stream': False,
                    'options': {
                        'temperature': 0.7,
                        'max_tokens': 50
                    }
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('response', '').strip()
            return ""
        except:
            return ""
