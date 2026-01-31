# Quick Testing Guide - Tamil TTS & Microphone Fixes

## What's New

### 1. Tamil Text-to-Speech
You can now talk to the AI in Tamil, and it will respond in Tamil with proper pronunciation!

### 2. Fixed Microphone Issues
- Better permission handling
- Clearer error messages
- Automatic echo cancellation and noise suppression
- Works reliably without dropping out

### 3. Voice Response Audio
When you use the microphone to talk, the AI's response will now be played as audio automatically.

---

## Testing Steps

### Test 1: Tamil Text Input with Audio Response
1. Start the application
2. Select a child profile
3. Toggle **Text Mode** (if in voice mode)
4. Type in Tamil: `வணக்கம், நீ எப்படி இருக்கிறாய்?`
5. Hit send
6. **Expected**: AI responds in Tamil with audio playback

### Test 2: English Text Input with Audio Response
1. Make sure you're in text mode
2. Type: `Hello, how are you?`
3. Hit send
4. **Expected**: AI responds in English with audio playback

### Test 3: Microphone Recording (Basic Test)
1. Toggle to **Voice Mode** (click the voice toggle)
2. Click the 🎤 button
3. Say something in English: *"Hello, can you hear me?"*
4. **Expected**: 
   - Button turns red/recording
   - Shows "🎤 Listening..."
   - Text appears as you speak
   - Once you stop, shows "✓ Sending..."
   - AI responds with text AND audio

### Test 4: Microphone Recording (Troubleshooting)
If microphone doesn't work:

#### Check 1: Browser Permissions
1. Click the lock icon in address bar
2. Look for "Microphone"
3. Change to "Allow"
4. Refresh page

#### Check 2: Microphone Device
1. Windows Settings → Privacy & Security → Microphone
2. Make sure microphone is turned ON
3. Check if other apps can access it

#### Check 3: Check Browser Console
1. Press F12 to open Developer Tools
2. Click "Console" tab
3. Look for error messages
4. Share any red errors with troubleshooting

### Test 5: Tamil with Microphone
1. Switch to voice mode
2. Click 🎤 button
3. Say something in Tamil: *"வணக்கம்"*
4. **Expected**: 
   - Recognition works (if your browser supports Tamil - usually Chromium-based)
   - AI responds in Tamil with audio

### Test 6: Error Messages
1. **Test Permission Denied**: 
   - Go to browser settings, block microphone
   - Try to record
   - **Expected**: Error message appears

2. **Test Network Error**:
   - Disconnect internet
   - Try to send message
   - **Expected**: Clear error message

---

## Expected Behavior

### Audio Playback
- ✅ Plays automatically when AI responds
- ✅ Uses character-specific voice settings
- ✅ Works with Tamil, English, and other languages
- ✅ Falls back to browser voice if backend TTS unavailable

### Microphone Recording
- ✅ Shows "🎤 Listening..." while recording
- ✅ Shows interim text as you speak
- ✅ Shows "✓ Sending..." after you finish
- ✅ Automatically stops when you stop speaking
- ✅ Plays AI response as audio

### Language Detection
- ✅ Automatic Tamil detection from text
- ✅ Automatic English detection
- ✅ Uses correct pronunciation for each language

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No sound output | Check volume, check browser audio settings |
| Microphone won't record | Check browser permissions, check device microphone |
| No voice recognition text | Ensure microphone is working, speak clearly |
| AI doesn't respond | Check backend is running (http://127.0.0.1:5000) |
| Tamil not recognized | Check if text is actual Tamil Unicode characters |
| Audio cuts off | Check internet connection, try again |

---

## Developer Notes

### Backend Endpoint
- **URL**: `http://127.0.0.1:5000/api/tts`
- **Method**: POST
- **Input**: `{ "text": "Your text here" }`
- **Output**: MP3 audio stream
- **Language Detection**: Automatic

### Browser Support
- ✅ Chrome (best support for speech recognition)
- ✅ Edge (Chromium-based, good support)
- ✅ Safari (limited Tamil recognition)
- ⚠️ Firefox (speech recognition may need setup)

### Audio Format
- MP3 stream from Google TTS
- Plays directly in browser
- No file saved to disk

---

## Console Logs

When testing, you should see logs like:
```
🔊 Converting to speech: language=ta, gtts_lang=ta, text=வணக்கம்...
🔊 Playing TTS audio
🎤 Speech recognition started
🎤 Transcribed: hello how are you
```

---

## Performance Notes

- First TTS request may take 1-2 seconds
- Subsequent requests are faster
- Audio is streamed, not saved to disk
- Microphone uses hardware echo cancellation
