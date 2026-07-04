import { useEffect, useRef, useState } from 'react';

export default function Calling({ callData, socket, agentText, isThinking, userText, screenImage, onEnd }) {
    const [isMicOn, setIsMicOn] = useState(false);
    const [duration, setDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setDuration(d => d + 1);
        }, 1000);

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

            mediaRecorder.start(250);
            setIsMicOn(true);
            console.log('🎤 Mic started');
        } catch (err) {
            console.log('❌ Mic error:', err.message);
        }
    };

    const stopMic = () => {
        if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        setIsMicOn(false);
    };

    const toggleMic = () => {
        if (isMicOn) stopMic();
        else startMic();
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

            {/* Screen / Agent View */}
            <div className="flex-1 relative overflow-hidden bg-[#0a0a0a]">
                {screenImage ? (
                    <div className="relative w-full h-full">
                        {/* Live screenshot */}
                        <img
                            src={`data:image/jpeg;base64,${screenImage}`}
                            alt="Live demo screen"
                            className="w-full h-full object-contain"
                        />

                        {/* Alex overlay top left */}
                        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur rounded-full px-3 py-1.5">
                            <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs">
                                🤖
                            </div>
                            <span className="text-white text-xs font-medium">Alex</span>
                            {isThinking && (
                                <div className="flex gap-0.5 ml-1">
                                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            )}
                        </div>

                        {/* User transcript top right */}
                        {userText && (
                            <div className="absolute top-3 right-3 bg-indigo-900/80 backdrop-blur rounded-xl px-3 py-2 max-w-36">
                                <p className="text-indigo-200 text-xs">"{userText}"</p>
                            </div>
                        )}

                        {/* Agent text bottom */}
                        {agentText && (
                            <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur rounded-xl px-4 py-3">
                                <p className="text-white text-xs leading-relaxed">{agentText}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    // No screenshot yet
                    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
                        <div className={`w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-lg transition-all ${isThinking ? 'shadow-yellow-500/30 scale-105' : 'shadow-indigo-500/30'
                            }`}>
                            🤖
                        </div>
                        {isThinking ? (
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-yellow-400 text-sm">Alex is thinking...</span>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm text-center">
                                {agentText || 'Loading demo screen...'}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="px-6 py-4 border-t border-[#2a2a2a]">
                <div className="flex items-center justify-center gap-4 mb-2">
                    <button
                        onClick={toggleMic}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-colors ${isMicOn
                                ? 'bg-indigo-600 hover:bg-indigo-500'
                                : 'bg-[#2a2a2a] hover:bg-[#3a3a3a]'
                            }`}
                    >
                        {isMicOn ? '🎙️' : '🔇'}
                    </button>
                    <button
                        onClick={onEnd}
                        className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-lg transition-colors"
                    >
                        📵
                    </button>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isMicOn ? 'bg-indigo-400 animate-pulse' : 'bg-gray-600'}`} />
                    <span className={`text-xs ${isMicOn ? 'text-indigo-400' : 'text-gray-500'}`}>
                        {isMicOn ? 'Listening...' : 'Mic off'}
                    </span>
                </div>
            </div>
        </div>
    );
}