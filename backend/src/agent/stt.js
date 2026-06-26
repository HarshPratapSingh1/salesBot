import { DeepgramClient } from '@deepgram/sdk';
import dotenv from 'dotenv';
dotenv.config();

const deepgram = new DeepgramClient(process.env.DEEPGRAM_API_KEY);

export function createSTTStream(onTranscript, onError) {
    const connection = deepgram.listen.live({
        model: 'nova-2',
        language: 'multi',
        detect_language: true,
        punctuate: true,
        interim_results: false,
        endpointing: 800
    });

    connection.on('open', () => {
        console.log('🎤 STT stream opened');
    });

    connection.on('transcript', (data) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        const language = data.channel?.detected_language || 'en';
        const confidence = data.channel?.alternatives?.[0]?.confidence || 0;

        if (transcript && transcript.trim() && confidence > 0.5) {
            console.log(`🗣️ Heard (${language}): ${transcript}`);
            onTranscript(transcript.trim(), language);
        }
    });

    connection.on('error', (err) => {
        console.log('❌ STT error:', err);
        if (onError) onError(err);
    });

    connection.on('close', () => {
        console.log('🎤 STT stream closed');
    });

    return connection;
}