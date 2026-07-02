import { useEffect, useRef, useState } from 'react';

export default function Calling({ callData, socket, agentText, isThinking, userText, onEnd }) {
    const [isMicOn, setIsMicOn] = useState(false);
    const [duration, setDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        // Start timer
        timerRef.current = setInterval(() => {
            setDuration(d => d + 1);
        }, 1000);

        // Start mic automatically
        startMic();

        return () => {
            clearInterval(timerRef.current);
            stopMic();
        };
    }, []);

    const startMic = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0 && socket && callData) {
                    e.data.arrayBuffer().then(buffer => {
                        socket.emit('audio-chunk', {
                            callId: callData.callId,
                            chunk: buffer
                        });
                    });
                }
            };

            mediaRecorder.start(250); // send chunks every 250ms
            setIsMicOn(true);
            console.log('🎤 Mic started');
        } catch (err) {
            console.log('❌ Mic error:', err.message);
        }
    };

    const stopMic = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        setIsMicOn(false);
    };

    const toggleMic = () => {
        if (isMicOn) {
            stopMic();
        } else {
            startMic();
        }
    };

    const formatDuration = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-white text-sm font-medium">Live Demo</span>
                </div>
                <span className="text-gray-500 text-sm">{formatDuration(duration)}</span>
            </div>

            {/* Agent */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">

                {/* Agent Avatar */}
                <div className={`w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-lg transition-all ${isThinking ? 'shadow-yellow-500/30 scale-105' : 'shadow-indigo-500/30'
                    }`}>
                    🤖
                </div>

                {/* Agent Status */}
                <div className="text-center mb-8">
                    {isThinking ? (
                        <div className="flex items-center gap-2 justify-center">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-yellow-400 text-sm">Alex is thinking...</span>
                        </div>
                    ) : agentText ? (
                        <p className="text-white text-sm leading-relaxed max-w-xs">
                            {agentText}
                        </p>
                    ) : (
                        <p className="text-gray-500 text-sm">Alex is ready — start speaking!</p>
                    )}
                </div>

                {/* User transcript */}
                {userText && (
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 mb-6 w-full max-w-xs">
                        <p className="text-xs text-gray-500 mb-1">You said:</p>
                        <p className="text-white text-sm">{userText}</p>
                    </div>
                )}

                {/* Mic indicator */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full mb-8 ${isMicOn
                        ? 'bg-indigo-950 border border-indigo-700'
                        : 'bg-[#1a1a1a] border border-[#2a2a2a]'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${isMicOn ? 'bg-indigo-400 animate-pulse' : 'bg-gray-600'}`} />
                    <span className={`text-xs ${isMicOn ? 'text-indigo-400' : 'text-gray-500'}`}>
                        {isMicOn ? 'Listening...' : 'Mic off'}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="px-6 py-6 border-t border-[#2a2a2a]">
                <div className="flex items-center justify-center gap-4">

                    {/* Mic toggle */}
                    <button
                        onClick={toggleMic}
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-colors ${isMicOn
                                ? 'bg-indigo-600 hover:bg-indigo-500'
                                : 'bg-[#2a2a2a] hover:bg-[#3a3a3a]'
                            }`}
                    >
                        {isMicOn ? '🎙️' : '🔇'}
                    </button>

                    {/* End call */}
                    <button
                        onClick={onEnd}
                        className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-xl transition-colors"
                    >
                        📵
                    </button>
                </div>

                <p className="text-center text-gray-600 text-xs mt-4">
                    Tap the mic to mute • Tap red to end demo
                </p>
            </div>
        </div>
    );
}