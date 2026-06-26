import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/register', form);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('client', JSON.stringify(res.data.client));
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
            <div className="w-full max-w-md">

                {/* Logo */}
                <div className="text-center mb-8">
                    <span className="text-3xl font-black text-indigo-500">⚡ SalesBot</span>
                    <p className="text-gray-500 mt-2 text-sm">AI-powered sales demo platform</p>
                </div>

                {/* Card */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-1">Create your account</h2>
                    <p className="text-gray-500 text-sm mb-8">Start converting visitors into customers</p>

                    {error && (
                        <div className="bg-red-950 border border-red-500 text-red-400 rounded-lg px-4 py-3 text-sm mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                            <input
                                type="text"
                                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                                placeholder="John Smith"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                            <input
                                type="email"
                                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                                placeholder="you@company.com"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                            <input
                                type="password"
                                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg py-3 transition-colors mt-2"
                        >
                            {loading ? 'Creating account...' : 'Create account'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}