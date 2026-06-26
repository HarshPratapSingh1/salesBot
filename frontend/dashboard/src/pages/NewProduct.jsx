import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api';

export default function NewProduct() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        url: '',
        email: '',
        password: '',
        extraKnowledge: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/products', form);
            navigate(`/products/${res.data.productId}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#0f0f0f]">
            <Sidebar />

            <main className="flex-1 p-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">Add New Product</h1>
                    <p className="text-gray-500 mt-1">
                        Submit your product and our AI will explore it automatically
                    </p>
                </div>

                <div className="max-w-2xl">

                    {/* Info Banner */}
                    <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-4 mb-6 flex gap-3">
                        <span className="text-indigo-400 text-lg">ℹ</span>
                        <div>
                            <p className="text-indigo-300 text-sm font-medium">How it works</p>
                            <p className="text-indigo-400 text-sm mt-1">
                                After submitting, our AI agent will automatically log into your product,
                                explore every page, and build a complete knowledge map. This usually takes 2-5 minutes.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-950 border border-red-500 text-red-400 rounded-lg px-4 py-3 text-sm mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Product Name */}
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                            <h3 className="text-white font-semibold mb-4">Product Info</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Product Name
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="My SaaS Product"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Product URL
                                    </label>
                                    <input
                                        type="url"
                                        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="https://app.yourproduct.com"
                                        value={form.url}
                                        onChange={e => setForm({ ...form, url: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Credentials */}
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                            <h3 className="text-white font-semibold mb-1">Demo Account Credentials</h3>
                            <p className="text-gray-500 text-xs mb-4">
                                Create a demo account in your product and enter its credentials here.
                                These are encrypted with AES-256.
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Email / Username
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="demo@yourproduct.com"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Extra Knowledge */}
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                            <h3 className="text-white font-semibold mb-1">Extra Knowledge</h3>
                            <p className="text-gray-500 text-xs mb-4">
                                Tell the agent anything extra it should know — pricing, target audience, key features, FAQs.
                            </p>
                            <textarea
                                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors resize-none"
                                placeholder="Our pricing starts at $49/month. We target B2B SaaS companies. Our key differentiator is..."
                                rows={5}
                                value={form.extraKnowledge}
                                onChange={e => setForm({ ...form, extraKnowledge: e.target.value })}
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl py-4 transition-colors text-sm"
                        >
                            {loading ? '🔍 Submitting & starting exploration...' : '🚀 Submit Product'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}