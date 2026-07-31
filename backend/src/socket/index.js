import { Server } from 'socket.io';
import { CallOrchestrator } from '../call/orchestrator.js';
import { generateToken } from '../call/room.js';
import Call from '../models/Call.js';
import Product from '../models/Product.js';
import { v4 as uuidv4 } from 'uuid';

const orchestrators = new Map();
const screenshotIntervals = new Map();

const STALE_CALL_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Safety-net sweep for calls that never got cleaned up via the normal
 * 'end-demo' or 'disconnect' paths (e.g. server crash/restart, a socket
 * disconnect event that never fires, laptop sleep, etc.). Runs on an
 * interval and marks any Call still 'active' well past a normal demo
 * length as 'failed', with duration computed from createdAt.
 */
function startStaleCallSweep() {
    setInterval(async () => {
        try {
            const cutoff = new Date(Date.now() - STALE_CALL_TIMEOUT_MS);
            const staleCalls = await Call.find({ status: 'active', createdAt: { $lt: cutoff } });

            for (const call of staleCalls) {
                // Only touch calls with no in-memory orchestrator — if one exists,
                // it's still genuinely active and being tracked normally.
                if (orchestrators.has(call._id.toString())) continue;

                const duration = Math.floor((Date.now() - call.createdAt.getTime()) / 1000);
                await Call.findByIdAndUpdate(call._id, { status: 'failed', duration });
                console.log(`🧹 Swept stale call ${call._id} — marked failed (no activity for 20+ min)`);
            }
        } catch (err) {
            console.log('❌ Stale call sweep error:', err.message);
        }
    }, 5 * 60 * 1000); // check every 5 minutes
}

export function initSocket(server) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : ['http://localhost:5173', 'http://localhost:5174'];

    const io = new Server(server, {
        cors: {
            origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
            methods: ['GET', 'POST']
        },
        maxHttpBufferSize: 10e6 // 10MB for audio blobs + screenshots
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        // Visitor starts a demo
        socket.on('start-demo', async ({ productId, prospectName, prospectEmail }) => {
            try {
                console.log(`🎬 Starting demo for product: ${productId}`);

                const product = await Product.findById(productId);
                if (!product) {
                    socket.emit('demo-error', { message: 'Product not found' });
                    return;
                }
                if (product.explorationStatus !== 'ready') {
                    socket.emit('demo-error', { message: 'Product is still being explored, please wait' });
                    return;
                }

                const roomName = `demo-${productId}-${uuidv4()}`;
                const call = await Call.create({
                    productId,
                    clientId: product.clientId,
                    roomUrl: roomName,
                    status: 'active',
                    prospectName: prospectName || '',
                    prospectEmail: prospectEmail || ''
                });

                const callId = call._id.toString();
                socket.join(callId);

                // Generate LiveKit tokens
                const visitorToken = await generateToken(roomName, `visitor-${socket.id}`);
                const agentToken = await generateToken(roomName, 'agent-alex');

                // Send tokens to visitor
                socket.emit('demo-started', {
                    callId,
                    roomName,
                    visitorToken,
                    agentToken,
                    livekitUrl: process.env.LIVEKIT_URL
                });

                // Start orchestrator
                const orchestrator = new CallOrchestrator(productId, callId, io);
                orchestrators.set(callId, orchestrator);
                await orchestrator.start();

                // Track this call on the socket so we can clean up properly on disconnect
                socket.activeCallId = callId;

                // Start screenshot streaming every 1 second
                const screenshotInterval = setInterval(async () => {
                    try {
                        if (orchestrator.navigator.page) {
                            const screenshot = await orchestrator.navigator.page.screenshot({
                                type: 'jpeg',
                                quality: 60
                            });
                            const base64 = screenshot.toString('base64');
                            io.to(callId).emit('screen-update', { image: base64 });
                        }
                    } catch (err) {
                        // page might be navigating — skip this frame
                    }
                }, 1000);

                screenshotIntervals.set(callId, screenshotInterval);

            } catch (err) {
                console.log('❌ Start demo error:', err.message);
                socket.emit('demo-error', { message: err.message });
            }
        });

        // Receive complete audio blob from visitor (VAD-triggered on client)
        socket.on('audio-blob', async ({ callId, audio }) => {
            const orchestrator = orchestrators.get(callId);
            if (orchestrator) {
                const audioBuffer = Buffer.from(audio);
                await orchestrator.handleAudioBlob(audioBuffer);
            }
        });

        // Legacy: still accept streaming audio chunks for backward compatibility
        socket.on('audio-chunk', ({ callId, chunk }) => {
            // No longer used with Whisper — VAD on client sends complete blobs
            // Kept for potential future use
        });

        // Frontend signals that agent audio finished playing
        socket.on('audio-playback-complete', ({ callId }) => {
            const orchestrator = orchestrators.get(callId);
            if (orchestrator) {
                orchestrator.handleAudioPlaybackComplete();
            }
        });

        // Visitor ends demo
        socket.on('end-demo', async ({ callId, prospectEmail, prospectName }) => {
            try {
                // Stop screenshot interval
                const interval = screenshotIntervals.get(callId);
                if (interval) {
                    clearInterval(interval);
                    screenshotIntervals.delete(callId);
                }

                const orchestrator = orchestrators.get(callId);
                if (orchestrator) {
                    await orchestrator.end(prospectEmail, prospectName);
                    orchestrators.delete(callId);
                }

                socket.activeCallId = null;
                socket.emit('demo-ended', { callId });
                console.log(`🏁 Demo ended: ${callId}`);
            } catch (err) {
                console.log('❌ End demo error:', err.message);
            }
        });

        // Handle disconnect — visitor closed the tab / lost connection mid-call
        // without a proper 'end-demo' event. Without this, the Call stays
        // status: 'active' forever with duration 0m 0s.
        socket.on('disconnect', async () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);

            const callId = socket.activeCallId;
            if (!callId) return; // no active call on this socket, nothing to clean up

            try {
                const interval = screenshotIntervals.get(callId);
                if (interval) {
                    clearInterval(interval);
                    screenshotIntervals.delete(callId);
                }

                const orchestrator = orchestrators.get(callId);
                if (orchestrator) {
                    await orchestrator.end('', '', 'failed');
                    orchestrators.delete(callId);
                    console.log(`⚠️ Call ${callId} marked failed (visitor disconnected without ending demo)`);
                }
            } catch (err) {
                console.log('❌ Error cleaning up disconnected call:', err.message);
            }
        });
    });

    startStaleCallSweep();

    return io;
}