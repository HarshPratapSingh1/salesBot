import { Server } from 'socket.io';
import { CallOrchestrator } from '../call/orchestrator.js';
import { generateToken } from '../call/room.js';
import Call from '../models/Call.js';
import Product from '../models/Product.js';
import { v4 as uuidv4 } from 'uuid';

const orchestrators = new Map();

export function initSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        // Visitor starts a demo
        socket.on('start-demo', async ({ productId }) => {
            try {
                console.log(`🎬 Starting demo for product: ${productId}`);

                // Check product is ready
                const product = await Product.findById(productId);
                if (!product) {
                    socket.emit('demo-error', { message: 'Product not found' });
                    return;
                }
                if (product.explorationStatus !== 'ready') {
                    socket.emit('demo-error', { message: 'Product is still being explored, please wait' });
                    return;
                }

                // Create call record
                const roomName = `demo-${productId}-${uuidv4()}`;
                const call = await Call.create({
                    productId,
                    clientId: product.clientId,
                    roomUrl: roomName,
                    status: 'active'
                });

                const callId = call._id.toString();
                socket.join(callId);

                // Generate LiveKit tokens
                const visitorToken = await generateToken(roomName, `visitor-${socket.id}`);
                const agentToken = await generateToken(roomName, 'agent-alex', true);

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

            } catch (err) {
                console.log('❌ Start demo error:', err.message);
                socket.emit('demo-error', { message: err.message });
            }
        });

        // Receive audio from visitor's mic
        socket.on('audio-chunk', ({ callId, chunk }) => {
            const orchestrator = orchestrators.get(callId);
            if (orchestrator) {
                orchestrator.sendAudioChunk(Buffer.from(chunk));
            }
        });

        // Visitor ends demo
        socket.on('end-demo', async ({ callId, prospectEmail, prospectName }) => {
            try {
                const orchestrator = orchestrators.get(callId);
                if (orchestrator) {
                    await orchestrator.end(prospectEmail, prospectName);
                    orchestrators.delete(callId);
                }
                socket.emit('demo-ended', { callId });
                console.log(`🏁 Demo ended: ${callId}`);
            } catch (err) {
                console.log('❌ End demo error:', err.message);
            }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });
    });

    return io;
}