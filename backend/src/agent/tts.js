import dotenv from 'dotenv';
dotenv.config();

export async function speak(text) {
    try {
        console.log(`🔊 Speaking: ${text.substring(0, 50)}...`);

        const response = await fetch('http://localhost:8000/v1/audio/speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'piper',
                input: text,
                voice: 'en_US-lessac-medium',
                speed: 1.0,
                response_format: 'wav'
            })
        });

        if (!response.ok) {
            throw new Error(`TTS server error: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log(`✅ TTS audio generated: ${buffer.length} bytes`);
        return buffer;

    } catch (err) {
        console.log('❌ TTS error:', err.message);
        throw err;
    }
}