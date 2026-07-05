import pkg from '@deepgram/sdk';
const { Deepgram } = pkg;
import dotenv from 'dotenv';
dotenv.config();

export async function createSTTStream(onTranscript, onError) {
    try {
        const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);

        const connection = deepgram.transcription.live({
            model: 'nova-2',
            language: 'en-US',
            punctuate: true,
            interim_results: false,
            endpointing: 800
        });

        let keepAliveInterval = null;

        connection.addListener('open', () => {
            console.log('🎤 STT stream opened (Deepgram)');

            // Send keepalive every 5 seconds to prevent timeout
            keepAliveInterval = setInterval(() => {
                try {
                    if (connection.getReadyState() === 1) {
                        connection.keepAlive();
                    }
                } catch (err) {
                    // ignore
                }
            }, 5000);
        });

        connection.addListener('transcriptReceived', (message) => {
            try {
                const data = JSON.parse(message);
                const transcript = data.channel?.alternatives?.[0]?.transcript;
                const confidence = data.channel?.alternatives?.[0]?.confidence || 0;

                if (transcript && transcript.trim() && confidence > 0.5) {
                    console.log(`🗣️ Heard: ${transcript}`);
                    onTranscript(transcript.trim(), 'en');
                }
            } catch (err) {
                // skip
            }
        });

        connection.addListener('error', (err) => {
            console.log('❌ STT error:', err.message || err);
            if (onError) onError(err);
        });

        connection.addListener('close', () => {
            console.log('🎤 STT stream closed');
            if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
            }
        });

        return {
            send: (chunk) => {
                try {
                    if (connection.getReadyState() === 1) {
                        connection.send(chunk);
                    }
                } catch (err) {
                    console.log('⚠️ STT send error:', err.message);
                }
            },
            finish: () => {
                if (keepAliveInterval) {
                    clearInterval(keepAliveInterval);
                }
                try {
                    connection.finish();
                } catch (err) {
                    // ignore
                }
            }
        };

    } catch (err) {
        console.log('❌ STT setup error:', err.message);
        return { send: () => { }, finish: () => { } };
    }
}