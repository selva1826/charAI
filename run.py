#!/usr/bin/env python3
"""
AutismAI - Therapy Companion
Easy startup script
"""

import os
import sys
import subprocess
import time

def check_ollama():
    """Check if Ollama is running"""
    try:
        import requests
        response = requests.get('http://localhost:11434/api/tags', timeout=2)
        return response.status_code == 200
    except:
        return False

def main():
    print("=" * 70)
    print("🌊 AutismAI - Therapy Companion".center(70))
    print("=" * 70)
    print()
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required!")
        sys.exit(1)
    
    # Check if requirements are installed
    try:
        import flask
        import requests
    except ImportError:
        print("📦 Installing dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print()
    
    # Check Ollama
    print("🔍 Checking Ollama...")
    if not check_ollama():
        print("⚠️  Ollama is not running!")
        print()
        print("Please start Ollama:")
        print("  1. Open a new terminal")
        print("  2. Run: ollama serve")
        print("  3. In another terminal run: ollama pull llama3.2")
        print()
        response = input("Start server anyway? (y/n): ")
        if response.lower() != 'y':
            sys.exit(0)
    else:
        print("✅ Ollama is running")
    
    print()
    print("=" * 70)
    print("🚀 Starting AutismAI Server...")
    print("=" * 70)
    print()
    print("📍 Open your browser to: http://127.0.0.1:5000")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 70)
    print()
    
    # Start Flask app
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    subprocess.run([sys.executable, "backend/app.py"])

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped. Goodbye!")
