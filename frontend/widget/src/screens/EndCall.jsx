import { useState } from 'react';

export default function EndCall({ onSubmit }) {
    const [form, setForm] = useState({ name: '', email: '' });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = () => {
        onSubmit(form.email, form.name);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-6">
                <div className="text-center">
                    <div className="text-5xl mb-4">🎉</div>
                    <h2 className="text-white text-xl font-bold mb-2">Thanks for joining!</h2>
                    <p className="text-gray-500 text-sm">Our team will be in touch soon.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-6">
            <div className="w-full max-w-sm">

                {/* Icon */}
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">👋</div>
                    <h2 className="text-white text-xl font-bold mb-2">
                        Great talking with you!
                    </h2>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Leave your details and our team will follow up with a personalized offer.
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Your Name
                        </label>
                        <input
                            type="text"
                            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                            placeholder="John Smith"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Your Email
                        </label>
                        <input
                            type="email"
                            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                            placeholder="you@company.com"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                    >
                        Submit & Get Follow Up
                    </button>
                    <button
                        onClick={() => onSubmit('', '')}
                        className="w-full bg-transparent text-gray-500 hover:text-gray-400 py-3 rounded-xl transition-colors text-sm"
                    >
                        Skip
                    </button>
                </div>
            </div>
        </div>
    );
}