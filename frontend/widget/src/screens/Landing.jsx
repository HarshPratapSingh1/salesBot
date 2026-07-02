export default function Landing({ onStart, error }) {
    return (
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-6">
            <div className="w-full max-w-sm text-center">

                {/* Agent Avatar */}
                <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-indigo-500/30">
                    🤖
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">
                    Hi! I'm Alex
                </h2>
                <p className="text-gray-400 text-sm mb-2">
                    Your AI demo specialist
                </p>
                <p className="text-gray-500 text-xs mb-8 leading-relaxed">
                    I'll give you a live, personalized tour of this product.
                    Ask me anything — I'll navigate and explain in real time.
                </p>

                {/* Features */}
                <div className="space-y-2 mb-8 text-left">
                    {[
                        { icon: '🎙️', text: 'Voice powered — just speak naturally' },
                        { icon: '🌐', text: 'Works in any language' },
                        { icon: '⚡', text: 'Live navigation — I show, not just tell' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg px-4 py-3">
                            <span>{item.icon}</span>
                            <span className="text-gray-400 text-sm">{item.text}</span>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="bg-red-950 border border-red-500 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
                        {error}
                    </div>
                )}

                {/* Start Button */}
                <button
                    onClick={onStart}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <span>🚀</span>
                    <span>Start Live Demo</span>
                </button>

                <p className="text-gray-600 text-xs mt-4">
                    Takes about 2-5 minutes • No signup required
                </p>
            </div>
        </div>
    );
}