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
                         conversation_history=None, model=None, context_summary=None, age=10):
        """Generate AI response using Ollama with language-specific model"""
        
        # Use specified model or default
        model_to_use = model or self.model
        
        # Get character config
        character = Config.CHARACTERS.get(character_id)
        if not character:
            return "I'm not sure who I am. Please try again!"
        
        # Build prompt
        system_prompt = character['system_prompt']
        
        # Add age-appropriate language adjustment
        if age <= 7:
            system_prompt += "\n\nIMPORTANT: This child is very young (5-7 years). Use ONLY 5-8 very simple words. Add emojis. Be extra gentle."
        elif age <= 11:
            system_prompt += "\n\nIMPORTANT: This child is 8-11 years old. Use simple sentences. Maximum 2 sentences."
        else:
            system_prompt += "\n\nIMPORTANT: This is a pre-teen (12-15 years). Be friendly but not childish."
        
        # Add emotion context if provided
        if emotion:
            emotion_context = f"\n\nThe child is feeling: {emotion}"
            system_prompt += emotion_context
        
        # Add context summary for memory continuity
        memory_context = ""
        if context_summary:
            memory_context = f"\n\nPREVIOUS CONTEXT (remember this about the child):\n{context_summary}\n"
        
        # Build conversation context
        context = ""
        if conversation_history and len(conversation_history) > 0:
            context = "\n\nRecent conversation:\n"
            for conv in conversation_history[-3:]:  # Last 3 messages
                context += f"Child: {conv.get('message', '')}\n"
                context += f"You: {conv.get('response', '')}\n"
        
        full_prompt = f"{system_prompt}{memory_context}{context}\n\nChild: {user_message}\n\nYou:"
        
        # Fallback responses based on character
        fallback_responses = {
            'puffy': "I hear you! Tell me more about how you're feeling.",
            'ollie': "That's interesting! What else would you like to share?",
            'sheldon': "Wow! What happens next in your story?",
            'clawde': "Good thinking! Can you tell me more about that?",
            'finley': "Great! What would you like to do next?"
        }
        
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
                        'num_predict': 100
                    }
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get('response', '').strip()
                
                # If empty response, use fallback
                if not ai_response:
                    return fallback_responses.get(character_id, "That's great! Tell me more!")
                
                # Ensure response is short (max 2-3 sentences)
                sentences = ai_response.split('. ')
                if len(sentences) > 2:
                    ai_response = '. '.join(sentences[:2]) + '.'
                
                return ai_response
            else:
                print(f"Ollama returned status {response.status_code}")
                return fallback_responses.get(character_id, "That's wonderful! Can you tell me more?")
        
        except requests.exceptions.Timeout:
            print("Ollama timeout - using fallback response")
            return fallback_responses.get(character_id, "That sounds interesting! What else?")
        except requests.exceptions.ConnectionError:
            print("Ollama connection error - is Ollama running?")
            return fallback_responses.get(character_id, "I'm listening! Go on...")
        except Exception as e:
            print(f"Ollama error: {str(e)}")
            return fallback_responses.get(character_id, "Tell me more about that!")
    
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
