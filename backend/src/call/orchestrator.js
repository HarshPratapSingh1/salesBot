import { transcribeAudio } from '../agent/stt.js';
import { speak } from '../agent/tts.js';
import { think } from '../agent/brain/index.js';
import { analyzeCallOutcome } from '../agent/sentiment.js';
import { Navigator } from '../agent/navigator/index.js';
import { decrypt } from '../utils/encryption.js';
import { generateToken } from '../call/room.js';
import Product from '../models/Product.js';
import Call from '../models/Call.js';
import Lead from '../models/Lead.js';
import { upsertLead, isZohoConfigured } from '../integrations/zoho.js';
import dotenv from 'dotenv';
dotenv.config();

export class CallOrchestrator {
    constructor(productId, callId, io) {
        this.productId = productId;
        this.callId = callId;
        this.io = io;
        this.product = null;
        this.navigator = new Navigator();
        this.conversationHistory = [];
        this.currentLanguage = 'en';
        this.isAgentSpeaking = false;
        this.isProcessing = false;
        this.isActive = false;
        this.transcript = '';
        this.startTime = null;
        this.interruptRequested = false;
        this.interruptMessage = '';
        this.speechSequence = 0;
        this.pendingUserTurn = null;
        this.currentSpeechController = null;
        this.lastActionKey = null;
        this.lastAgentMessage = '';
        this.wasInterrupted = false;
        this.audioPlaybackResolver = null;
    }

    /**
     * Persist a single message to Call.messages[] immediately after each turn.
     * Incremental saves mean the transcript survives crashes/disconnects.
     */
    async recordMessage(role, content) {
        if (!content) return;
        try {
            await Call.findByIdAndUpdate(this.callId, {
                $push: { messages: { role, content, timestamp: new Date() } }
            });
        } catch (err) {
            console.log('⚠️ Failed to persist message:', err.message);
        }
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

            await this.navigator.launch();
            await this.navigator.login(
                this.product.url,
                this.product.knowledgeMap.loginSteps,
                decrypt(this.product.credentials.email),
                decrypt(this.product.credentials.password)
            );

            const openingText = `Hey there! I'm Alex. Welcome! I'll be walking you through ${this.product.name} today. Feel free to ask me anything or just tell me what you'd like to see — I'm here to help!`;
            this.transcript += `\nAgent: ${openingText}`;
            await this.agentSpeak(openingText);
            await this.recordMessage('agent', openingText);

            console.log(`✅ Call ${this.callId} started`);

        } catch (err) {
            console.log('❌ Orchestrator start failed:', err.message);
            this.isActive = false;
            throw err;
        }
    }

    async handleAudioBlob(audioBuffer) {
        if (!this.isActive) return;

        if (this.currentSpeechController) {
            this.currentSpeechController.abort();
        }

        this.interruptRequested = true;
        this.interruptMessage = 'User interrupted the current response.';
        this.handleAudioPlaybackComplete();
        this.io.to(this.callId).emit('agent-state', 'processing');

        if (this.isProcessing) {
            this.pendingUserTurn = { audioBuffer, language: this.currentLanguage };
            return;
        }

        try {
            this.isProcessing = true;

            const result = await transcribeAudio(audioBuffer, this.currentLanguage);
            const transcript = result.text;
            const language = result.language;

            if (!transcript || transcript.trim().length === 0) {
                this.isProcessing = false;
                this.io.to(this.callId).emit('agent-state', 'idle');
                return;
            }

            const noise = transcript.trim().toLowerCase();
            const noisePatterns = [
                /^(um|uh|hmm|ah|oh|huh)$/,
                /^\W+$/,
                /^.{1,2}$/,
                /^(you|the|a|i|it|is)$/,
            ];
            if (noisePatterns.some(p => p.test(noise))) {
                console.log(`🔇 Filtered noise: "${transcript}"`);
                this.isProcessing = false;
                this.io.to(this.callId).emit('agent-state', 'idle');
                return;
            }

            this.wasInterrupted = this.isAgentSpeaking;
            await this.handleUserSpeech(transcript, language);

        } catch (err) {
            console.log('❌ Audio blob processing error:', err.message);
            this.isProcessing = false;
            this.io.to(this.callId).emit('agent-state', 'idle');
        }
    }

    async handleUserSpeech(transcript, language) {
        try {
            console.log(`👤 User (${language}): ${transcript}`);

            this.speechSequence += 1;
            const interruptId = this.speechSequence;

            this.currentLanguage = language || this.currentLanguage;
            this.transcript += `\nUser: ${transcript}`;

            this.conversationHistory.push({ role: 'user', content: transcript });
            await this.recordMessage('user', transcript);

            if (this.wasInterrupted && this.lastAgentMessage) {
                this.conversationHistory.push({
                    role: 'system',
                    content: `[System: The user just interrupted you while you were saying: "${this.lastAgentMessage.substring(0, 100)}...". Address their question/request first, then naturally resume or offer to continue where you left off.]`
                });
                this.wasInterrupted = false;
            }

            this.io.to(this.callId).emit('user-transcript', {
                text: transcript,
                language: this.currentLanguage
            });

            let stepCount = 0;
            const maxSteps = 5;

            while (stepCount < maxSteps && this.isActive) {
                if (this.interruptRequested && interruptId < this.speechSequence) {
                    console.log('🛑 Interrupted by newer user turn; stopping.');
                    break;
                }
                stepCount++;

                this.io.to(this.callId).emit('agent-thinking', true);
                this.io.to(this.callId).emit('agent-state', 'processing');

                const pageContext = await this.navigator.getPageContext();
                if (!this.isActive) break; // call may have ended while awaiting page context

                const decision = await think(
                    stepCount === 1
                        ? transcript
                        : '(Continue — the previous action completed successfully. Look at CURRENT PAGE STATE to see where you are now.)',
                    this.currentLanguage,
                    this.product.knowledgeMap,
                    this.conversationHistory,
                    this.product.name,
                    pageContext
                );

                if (!this.isActive) break; // call may have ended while awaiting the model

                this.io.to(this.callId).emit('agent-thinking', false);

                let responseText = decision.message.content;
                const hasToolCalls = decision.finish_reason === 'tool_calls' && decision.message.tool_calls?.length > 0;

                if (!responseText && hasToolCalls) {
                    try {
                        const firstCall = decision.message.tool_calls[0];
                        const peekArgs = JSON.parse(firstCall.function.arguments);
                        const peekKey = `${firstCall.function.name}:${JSON.stringify(peekArgs)}`;
                        const label = peekArgs.pageName || peekArgs.description || peekArgs.label;

                        responseText = (peekKey === this.lastActionKey)
                            ? "We're already here — what else would you like to see?"
                            : (label ? `Let's take a look at ${label}.` : "Let me show you.");
                    } catch {
                        responseText = "Let me show you.";
                    }
                }

                if (responseText && this.isActive) {
                    this.transcript += `\nAgent: ${responseText}`;
                    this.conversationHistory.push({ role: 'assistant', content: responseText });
                    await this.agentSpeak(responseText, interruptId);
                    await this.recordMessage('agent', responseText);
                }

                if (!this.isActive) break; // call ended during agentSpeak — don't touch the (now-closed) browser

                if (decision.finish_reason === 'tool_calls' && decision.message.tool_calls) {
                    for (const toolCall of decision.message.tool_calls) {
                        if (!this.isActive) break; // call ended between tool calls

                        const toolName = toolCall.function.name;
                        const toolArgs = JSON.parse(toolCall.function.arguments);

                        const actionKey = `${toolName}:${JSON.stringify(toolArgs)}`;
                        if (actionKey === this.lastActionKey) {
                            console.log(`🔁 Repeated action detected: ${actionKey}. Breaking.`);
                            decision.finish_reason = 'stop';
                            break;
                        }
                        this.lastActionKey = actionKey;

                        await this.navigator.executeAction(toolName, toolArgs);
                        this.io.to(this.callId).emit('navigation-event', { tool: toolName, args: toolArgs });
                    }
                }

                if (decision.finish_reason === 'stop') {
                    console.log('🛑 Agent finished sequence, waiting for user.');
                    break;
                }
            }

            if (stepCount >= maxSteps) {
                console.log('⚠️ Reached max steps (5). Force pausing.');
            }

            if (this.isActive) {
                await this.checkSessionTimeout();
            }

            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-16);
            }

        } catch (err) {
            console.log('❌ Error handling user speech:', err.message);
            this.io.to(this.callId).emit('agent-thinking', false);
        } finally {
            this.isProcessing = false;
            this.interruptRequested = false;
            this.currentSpeechController = null;
            this.io.to(this.callId).emit('agent-state', 'idle');

            if (this.pendingUserTurn) {
                const pendingTurn = this.pendingUserTurn;
                this.pendingUserTurn = null;
                await this.handleAudioBlob(pendingTurn.audioBuffer);
            }
        }
    }

    handleAudioPlaybackComplete() {
        if (this.audioPlaybackResolver) {
            this.audioPlaybackResolver();
            this.audioPlaybackResolver = null;
        }
    }

    async waitForAudioPlayback() {
        return new Promise(resolve => {
            this.audioPlaybackResolver = resolve;
            setTimeout(() => {
                if (this.audioPlaybackResolver) {
                    this.audioPlaybackResolver();
                    this.audioPlaybackResolver = null;
                }
            }, 15000);
        });
    }

    async agentSpeak(text, interruptId = 0) {
        try {
            this.isAgentSpeaking = true;
            this.lastAgentMessage = text;
            const controller = new AbortController();
            this.currentSpeechController = controller;
            this.io.to(this.callId).emit('agent-speaking', { text, speaking: true });
            this.io.to(this.callId).emit('agent-state', 'speaking');

            if (this.interruptRequested && interruptId < this.speechSequence) {
                this.io.to(this.callId).emit('agent-speaking', { text, speaking: false, interrupted: true });
                return;
            }

            const audio = await speak(text, controller.signal);

            if (this.interruptRequested && interruptId < this.speechSequence) {
                this.io.to(this.callId).emit('agent-speaking', { text, speaking: false, interrupted: true });
                return;
            }

            this.io.to(this.callId).emit('agent-audio', audio);
            await this.waitForAudioPlayback();

            this.isAgentSpeaking = false;
            this.io.to(this.callId).emit('agent-speaking', { text, speaking: false, interrupted: false });

        } catch (err) {
            console.log('❌ Agent speak error:', err.message);
            this.isAgentSpeaking = false;
        }
    }

    async checkSessionTimeout() {
        if (!this.isActive || !this.navigator.page) return;

        const loggedOut = await this.navigator.checkIfLoggedOut(this.product.url);
        if (loggedOut && this.isActive && this.navigator.page) {
            console.log('⚠️ Session expired — re-logging in');
            await this.navigator.login(
                this.product.url,
                this.product.knowledgeMap.loginSteps,
                decrypt(this.product.credentials.email),
                decrypt(this.product.credentials.password)
            );
        }

        if (!this.isActive) return;

        const elapsed = Date.now() - this.startTime;
        if (elapsed > 30 * 60 * 1000) {
            const followupText = "We've covered a lot today! I'd love to have someone from our team follow up with you. Can I get your email address?";
            this.transcript += `\nAgent: ${followupText}`;
            await this.agentSpeak(followupText);
            await this.recordMessage('agent', followupText);
        }
    }

    async end(prospectEmail = '', prospectName = '', status = 'completed') {
        try {
            this.isActive = false;

            const duration = Math.floor((Date.now() - this.startTime) / 1000);

            // Analyze transcript for satisfaction + qualification (best-effort)
            const {
                satisfaction,
                satisfactionReason,
                qualified,
                qualificationReason
            } = await analyzeCallOutcome(this.transcript);

            const update = {
                transcript: this.transcript,
                language: this.currentLanguage,
                duration,
                status,
                satisfaction,
                satisfactionReason,
                qualified,
                qualificationReason
            };
            if (prospectEmail) update.prospectEmail = prospectEmail;
            if (prospectName) update.prospectName = prospectName;

            const call = await Call.findByIdAndUpdate(this.callId, update, { new: true });

            // Create Lead + sync to Zoho if qualified
            if (qualified) {
                await this.createLeadAndSyncToZoho(call, qualificationReason);
            }

            await this.navigator.close();
            console.log(`✅ Call ${this.callId} ended — duration: ${duration}s | qualified: ${qualified} | satisfaction: ${satisfaction}`);

        } catch (err) {
            console.log('❌ Error ending call:', err.message);
        }
    }

    async createLeadAndSyncToZoho(call, qualificationReason) {
        try {
            const lead = await Lead.create({
                callId: call._id,
                productId: call.productId,
                clientId: call.clientId,
                prospectName: call.prospectName,
                prospectEmail: call.prospectEmail,
                qualified: true,
                notes: qualificationReason,
                status: 'Not Contacted',
                zohoSyncStatus: isZohoConfigured() ? 'pending' : 'skipped',
            });

            console.log(`🎯 Lead created: ${lead._id}`);

            if (!isZohoConfigured()) {
                console.log('ℹ️ Zoho not configured — lead saved locally only');
                return;
            }

            if (!call.prospectEmail) {
                await Lead.findByIdAndUpdate(lead._id, {
                    zohoSyncStatus: 'skipped',
                    zohoSyncError: 'No email captured for this visitor'
                });
                console.log('⚠️ Skipping Zoho sync — no prospect email');
                return;
            }

            try {
                const product = await Product.findById(call.productId).select('name');
                const { id: zohoLeadId } = await upsertLead({
                    name: call.prospectName,
                    email: call.prospectEmail,
                    productName: product?.name,
                    status: 'Not Contacted',
                    notes: qualificationReason,
                });

                await Lead.findByIdAndUpdate(lead._id, {
                    zohoLeadId,
                    zohoSyncStatus: 'synced',
                    zohoSyncError: ''
                });
                console.log(`✅ Lead synced to Zoho: ${zohoLeadId}`);

            } catch (zohoErr) {
                console.log('⚠️ Zoho sync failed (lead saved locally):', zohoErr.message);
                await Lead.findByIdAndUpdate(lead._id, {
                    zohoSyncStatus: 'failed',
                    zohoSyncError: zohoErr.message.slice(0, 300)
                });
            }

        } catch (err) {
            console.log('❌ Error creating lead:', err.message);
        }
    }
}