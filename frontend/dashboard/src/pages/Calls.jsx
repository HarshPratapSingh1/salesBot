import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api';

export default function Calls() {
    const [calls, setCalls] = useState([]);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('calls');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [callsRes, leadsRes] = await Promise.all([
                api.get('/calls'),
                api.get('/calls/leads/all')
            ]);
            setCalls(callsRes.data);
            setLeads(leadsRes.data);
        } catch (err) {
            console.log('Error fetching calls:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    return (
        <div className="flex min-h-screen bg-[#0f0f0f]">
            <Sidebar />

            <main className="flex-1 p-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">Calls & Leads</h1>
                    <p className="text-gray-500 mt-1">Track all demo calls and captured leads</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('calls')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'calls'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                            }`}
                    >
                        📞 Calls ({calls.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('leads')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'leads'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                            }`}
                    >
                        👤 Leads ({leads.length})
                    </button>
                </div>

                {loading ? (
                    <p className="text-gray-500 text-sm">Loading...</p>
                ) : activeTab === 'calls' ? (
                    calls.length === 0 ? (
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-16 text-center">
                            <p className="text-4xl mb-4">📞</p>
                            <h3 className="text-lg font-semibold text-white mb-2">No calls yet</h3>
                            <p className="text-gray-500 text-sm">
                                Calls will appear here once visitors start demos on your website
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {calls.map(call => (
                                <div
                                    key={call._id}
                                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-950 rounded-full flex items-center justify-center text-lg">
                                            👤
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">
                                                {call.prospectName || 'Anonymous visitor'}
                                            </p>
                                            <p className="text-gray-500 text-sm mt-0.5">
                                                {call.prospectEmail || 'No email captured'}
                                            </p>
                                            <p className="text-gray-600 text-xs mt-1">
                                                {call.productId?.name} •{' '}
                                                {new Date(call.createdAt).toLocaleDateString()} •{' '}
                                                {formatDuration(call.duration || 0)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${call.status === 'completed'
                                                ? 'bg-green-950 text-green-400'
                                                : call.status === 'active'
                                                    ? 'bg-blue-950 text-blue-400 animate-pulse'
                                                    : 'bg-gray-800 text-gray-400'
                                            }`}>
                                            {call.status}
                                        </span>
                                        {call.language && (
                                            <span className="text-xs bg-[#0f0f0f] text-gray-400 px-2 py-1 rounded-lg">
                                                {call.language}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    leads.length === 0 ? (
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-16 text-center">
                            <p className="text-4xl mb-4">👤</p>
                            <h3 className="text-lg font-semibold text-white mb-2">No leads yet</h3>
                            <p className="text-gray-500 text-sm">
                                Leads will appear here once visitors provide their contact info
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {leads.map(lead => (
                                <div
                                    key={lead._id}
                                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-purple-950 rounded-full flex items-center justify-center text-lg">
                                            👤
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">
                                                {lead.prospectName || 'Unknown'}
                                            </p>
                                            <p className="text-gray-500 text-sm mt-0.5">
                                                {lead.prospectEmail || 'No email'}
                                            </p>
                                            <p className="text-gray-600 text-xs mt-1">
                                                {lead.productId?.name} •{' '}
                                                {new Date(lead.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${lead.qualified
                                            ? 'bg-green-950 text-green-400'
                                            : 'bg-gray-800 text-gray-400'
                                        }`}>
                                        {lead.qualified ? '✅ Qualified' : 'Unqualified'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </main>
        </div>
    );
}