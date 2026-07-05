import { createSTTStream } from '../agent/stt.js';
import { speak } from '../agent/tts.js';
import { think } from '../agent/brain/index.js';
import { Navigator } from '../agent/navigator/index.js';
import { decrypt } from '../utils/encryption.js';
import { generateToken } from '../call/room.js';
import Product from '../models/Product.js';
import Call from '../models/Call.js';
import dotenv from 'dotenv';
dotenv.config();

export class CallOrchestrator {
    constructor(productId, callId, io) {
        this.productId = productId;
        this.callId = callId;
        this.io = io;
        this.product = null;
        this.navigator = new Navigator();
        this.sttStream = null;
        this.conversationHistory = [];
        this.currentLanguage = 'en';
        this.isAgentSpeaking = false;
        this.isActive = false;
        this.transcript = '';
        this.startTime = null;
    }

    async start() {
        try {
            this.product = await Product.findById(this.productId);
            if (!this.product) throw new Error('Product not found');
            if (this.product.explorationStatus !== 'ready') {
                throw new Error('Product exploration not complete yet');
            }

            this.isActive = true;
            this.startTime = Date.now();

            // Launch browser and login
            await this.navigator.launch();
            await this.navigator.login(
                this.product.url,
                this.product.knowledgeMap.loginSteps,
                decrypt(this.product.credentials.email),
                decrypt(this.product.credentials.password)
            );

            // Start STT stream (now async)
            this.sttStream = await createSTTStream(
                async (transcript, language) => {
                    if (!this.isActive) return;
                    if (this.isAgentSpeaking) return;
                    await this.handleUserSpeech(transcript, language);
                },
                (err) => {
                    console.log('STT error in orchestrator:', err);
                }
            );

            // Opening message
            await this.agentSpeak(
                `Hi there! I'm Alex, your personal demo guide for ${this.product.name}. I'm logged in and ready to show you around. What would you like to see first?`
            );

            console.log(`✅ Call ${this.callId} started`);

        } catch (err) {
            console.log('❌ Orchestrator start failed:', err.message);
            this.isActive = false;
            throw err;
        }
    }

    async handleUserSpeech(transcript, language) {
        try {
            console.log(`👤 User (${language}): ${transcript}`);

            this.currentLanguage = language || this.currentLanguage;
            this.transcript += `\nUser: ${transcript}`;

            this.conversationHistory.push({
                role: 'user',
                content: transcript
            });

            this.io.to(this.callId).emit('user-transcript', {
                text: transcript,
                language: this.currentLanguage
            });

            this.io.to(this.callId).emit('agent-thinking', true);

            const decision = await think(
                transcript,
                this.currentLanguage,
                this.product.knowledgeMap,
                this.conversationHistory,
                this.product.name
            );

            this.io.to(this.callId).emit('agent-thinking', false);

            if (decision.finish_reason === 'tool_calls' && decision.message.tool_calls) {
                for (const toolCall of decision.message.tool_calls) {
                    const toolName = toolCall.function.name;
                    const toolArgs = JSON.parse(toolCall.function.arguments);
                    await this.navigator.executeAction(toolName, toolArgs);
                    this.io.to(this.callId).emit('navigation-event', {
                        tool: toolName,
                        args: toolArgs
                    });
                }
            }

            const responseText = decision.message.content;
            if (responseText) {
                this.transcript += `\nAgent: ${responseText}`;
                this.conversationHistory.push({
                    role: 'assistant',
                    content: responseText
                });
                await this.agentSpeak(responseText);
            }

            await this.checkSessionTimeout();

            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-16);
            }

        } catch (err) {
            console.log('❌ Error handling user speech:', err.message);
            this.io.to(this.callId).emit('agent-thinking', false);
        }
    }

    async agentSpeak(text) {
        try {
            this.isAgentSpeaking = true;
            this.io.to(this.callId).emit('agent-speaking', { text, speaking: true });

            const audio = await speak(text);
            this.io.to(this.callId).emit('agent-audio', audio);

            this.isAgentSpeaking = false;
            this.io.to(this.callId).emit('agent-speaking', { text, speaking: false });

        } catch (err) {
            console.log('❌ Agent speak error:', err.message);
            this.isAgentSpeaking = false;
        }
    }

    async checkSessionTimeout() {
        const loggedOut = await this.navigator.checkIfLoggedOut(this.product.url);
        if (loggedOut) {
            console.log('⚠️ Session expired — re-logging in');
            await this.navigator.login(
                this.product.url,
                this.product.knowledgeMap.loginSteps,
                decrypt(this.product.credentials.email),
                decrypt(this.product.credentials.password)
            );
        }

        const elapsed = Date.now() - this.startTime;
        if (elapsed > 30 * 60 * 1000) {
            await this.agentSpeak(
                "We've covered a lot today! I'd love to have someone from our team follow up with you. Can I get your email address?"
            );
        }
    }

    sendAudioChunk(chunk) {
        if (this.sttStream && this.isActive) {
            this.sttStream.send(chunk);
        }
    }

    async end(prospectEmail = '', prospectName = '') {
        try {
            this.isActive = false;

            const duration = Math.floor((Date.now() - this.startTime) / 1000);
            await Call.findByIdAndUpdate(this.callId, {
                transcript: this.transcript,
                language: this.currentLanguage,
                duration,
                prospectEmail,
                prospectName,
                status: 'completed'
            });

            if (this.sttStream) {
                this.sttStream.finish();
            }
            await this.navigator.close();

            console.log(`✅ Call ${this.callId} ended — duration: ${duration}s`);

        } catch (err) {
            console.log('❌ Error ending call:', err.message);
        }
    }
}