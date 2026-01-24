"""
Language Detection Router
Detects language and routes to appropriate LLM
"""

import re
from typing import Tuple

class LanguageDetector:
    
    # Tamil Unicode range
    TAMIL_RANGE = (0x0B80, 0x0BFF)
    
    # Marathi Unicode range (Devanagari)
    MARATHI_RANGE = (0x0900, 0x097F)
    
    @staticmethod
    def detect_language(text: str) -> str:
        """
        Detect language from text
        
        Returns: 'en', 'ta', 'mr', or 'en' (default)
        """
        if not text:
            return 'en'
        
        # Count characters in each language range
        tamil_chars = sum(1 for c in text if LanguageDetector.TAMIL_RANGE[0] <= ord(c) <= LanguageDetector.TAMIL_RANGE[1])
        marathi_chars = sum(1 for c in text if LanguageDetector.MARATHI_RANGE[0] <= ord(c) <= LanguageDetector.MARATHI_RANGE[1])
        
        total_chars = len(text.replace(' ', ''))
        
        if total_chars == 0:
            return 'en'
        
        # If >30% Tamil characters
        if tamil_chars / total_chars > 0.3:
            return 'ta'
        
        # If >30% Marathi characters
        if marathi_chars / total_chars > 0.3:
            return 'mr'
        
        # Default to English
        return 'en'
    
    @staticmethod
    def route_to_model(language: str) -> Tuple[str, str]:
        """
        Route language to appropriate model
        
        Returns: (model_name, base_url)
        """
        if language in ['ta', 'mr']:
            return ('llama3.2', 'http://localhost:11434')
        else:
            return ('llama3.2', 'http://localhost:11434')
