import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import DemoView from './components/DemoView';

const SERVER_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function App() {
    const [screen, setScreen] = useState('landing');
    const [socket, setSocket] = useState(null);
    const [callData, setCallData] = useState(null);
    const [error, setError] = useState('');
    const [screenImage, setScreenImage] = useState(null);
    const [leadForm, setLeadForm] = useState({ name: '', email: '' });
    const [leadFormTouched, setLeadFormTouched] = useState(false);

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('pid');

    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isLeadFormValid = leadForm.name.trim().length > 0 && isValidEmail(leadForm.email);

    useEffect(() => {
        const s = io(SERVER_URL);
        setSocket(s);

        s.on('connect', () => console.log('✅ Socket connected'));

        s.on('demo-started', (data) => {
            setCallData(data);
            setScreen('calling');
        });

        s.on('demo-error', (data) => {
            setError(data.message);
            setScreen('landing');
        });

        s.on('screen-update', (data) => {
            setScreenImage(data.image);
        });

        s.on('demo-ended', () => {
            setScreen('end');
        });

        return () => s.disconnect();
    }, []);

    const startDemo = () => {
        if (!socket || !productId) return;
        setError('');
        setScreenImage(null);
        socket.emit('start-demo', {
            productId,
            prospectName: leadForm.name,
            prospectEmail: leadForm.email,
        });
        setScreen('loading');
    };

    const handleLeadFormContinue = () => {
        setLeadFormTouched(true);
        if (!isLeadFormValid) return;
        startDemo();
    };

    const endDemo = () => {
        if (!socket || !callData) return;
        socket.emit('end-demo', { callId: callData.callId });
    };

    if (!productId) {
        return (
            <div className="no-product">
                <p>No product ID provided</p>
            </div>
        );
    }

    // ── Landing Screen ──
    if (screen === 'landing') {
        return (
            <div className="landing-screen">
                <div className="landing-card">
                    <div className="landing-avatar">🤖</div>
                    <h2>Hi! I'm Alex</h2>
                    <p className="subtitle">Your AI demo specialist</p>
                    <p className="description">
                        I'll give you a live, personalized tour of this product.
                        Ask me anything — I'll navigate and explain in real time.
                    </p>

                    <div className="landing-features">
                        {[
                            { icon: '🎙️', text: 'Voice powered — just speak naturally' },
                            { icon: '🌐', text: 'Works in any language' },
                            { icon: '⚡', text: 'Live navigation — I show, not just tell' },
                        ].map((item, i) => (
                            <div key={i} className="landing-feature">
                                <span className="feature-icon">{item.icon}</span>
                                <span className="feature-text">{item.text}</span>
                            </div>
                        ))}
                    </div>

                    {error && <div className="landing-error">{error}</div>}

                    <button className="start-btn" onClick={() => setScreen('lead-form')}>
                        <span>🚀</span>
                        <span>Start Live Demo</span>
                    </button>

                    <p className="landing-footer">
                        Takes about 2-5 minutes • No signup required
                    </p>
                </div>
            </div>
        );
    }

    // ── Pre-Demo Lead Gate ──
    // Visitor must provide name + email before the demo will start.
    if (screen === 'lead-form') {
        return (
            <div className="endcall-screen">
                <div className="endcall-card">
                    <div className="endcall-header">
                        <div className="endcall-icon">👋</div>
                        <p className="leadgate-step">Step 1 of 2</p>
                        <h2>Before we get started</h2>
                        <p className="endcall-subtitle">
                            Just need a couple details so Alex knows who they're talking to.
                        </p>
                    </div>

                    <div className="endcall-form">
                        <div className="form-group">
                            <label>Your Name *</label>
                            <input
                                type="text"
                                placeholder="John Smith"
                                value={leadForm.name}
                                onChange={e => setLeadForm({ ...leadForm, name: e.target.value })}
                            />
                            {leadFormTouched && leadForm.name.trim().length === 0 && (
                                <p className="leadgate-error">Name is required</p>
                            )}
                        </div>
                        <div className="form-group">
                            <label>Your Email *</label>
                            <input
                                type="email"
                                placeholder="you@company.com"
                                value={leadForm.email}
                                onChange={e => setLeadForm({ ...leadForm, email: e.target.value })}
                            />
                            {leadFormTouched && !isValidEmail(leadForm.email) && (
                                <p className="leadgate-error">A valid email is required</p>
                            )}
                        </div>
                    </div>

                    <div className="endcall-actions">
                        <button
                            className="submit-btn"
                            onClick={handleLeadFormContinue}
                            disabled={leadFormTouched && !isLeadFormValid}
                        >
                            Continue to Demo →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Loading Screen ──
    if (screen === 'loading') {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <p>Starting your demo...</p>
                <p className="loading-sub">Logging into product...</p>
            </div>
        );
    }

    // ── Demo View (main experience) ──
    if (screen === 'calling' && callData) {
        return (
            <DemoView
                callData={callData}
                socket={socket}
                screenImage={screenImage}
                onEnd={endDemo}
            />
        );
    }

    // ── Thank You Screen ──
    if (screen === 'end') {
        return (
            <div className="thankyou-screen">
                <div className="thankyou-icon">🎉</div>
                <h2>Thanks for the demo, {leadForm.name || 'friend'}!</h2>
                <p>Our team will be in touch soon at {leadForm.email}.</p>
            </div>
        );
    }

    return null;
}