import { ElevenLabsClient } from 'elevenlabs';
import dotenv from 'dotenv';
dotenv.config();

const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY
});

const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Rachel — natural female voice

export async function speak(text) {
    try {
        console.log(`🔊 Speaking: ${text.substring(0, 50)}...`);

        const audioStream = await client.textToSpeech.convertAsStream(VOICE_ID, {
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.3,
                use_speaker_boost: true
            }
        });
        
        // Collect stream chunks into buffer
        const chunks = [];
        for await (const chunk of audioStream) {
            chunks.push(chunk);
        }

        return Buffer.concat(chunks);
    } catch (err) {
        console.log('❌ TTS error:', err.message);
        throw err;
    }
}