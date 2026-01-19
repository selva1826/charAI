/**
 * API Service - Handles all backend communication
 */

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const API = {
    // Health check
    async checkHealth() {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            return await response.json();
        } catch (error) {
            console.error('Health check failed:', error);
            return { status: 'error', ollama_available: false };
        }
    },
    
    // Children
    async getChildren() {
        const response = await fetch(`${API_BASE_URL}/children`);
        return await response.json();
    },
    
    async createChild(name, avatar = '👦') {
        const response = await fetch(`${API_BASE_URL}/children`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, avatar })
        });
        return await response.json();
    },
    
    async getChild(childId) {
        const response = await fetch(`${API_BASE_URL}/children/${childId}`);
        return await response.json();
    },
    
    // Chat
    async sendMessage(childId, character, message, emotion = null) {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                child_id: childId,
                character: character,
                message: message,
                emotion: emotion
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to send message');
        }
        
        return await response.json();
    },
    
    // Characters
    async getCharacters() {
        const response = await fetch(`${API_BASE_URL}/characters`);
        return await response.json();
    }
};
