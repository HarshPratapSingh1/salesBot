import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const BAR_MAX_HEIGHT = 80;

export default function Analytics() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/calls/analytics');
            setAnalytics(res.data);
        } catch (err) {
            console.log('Error fetching analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    const handleExport = async () => {
        try {
            const res = await api.get('/calls/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'salesbot-sessions.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.log('Export error:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-[#0f0f0f]">
                <Sidebar />
                <main className="flex-1 p-8 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </main>
            </div>
        );
    }

    const maxCount = analytics?.callsPerDay
        ? Math.max(...analytics.callsPerDay.map(d => d.count), 1)
        : 1;

    const statCards = [
        { label: 'Total Sessions', value: analytics?.totalCalls || 0, icon: '📞', color: 'text-indigo-400', bg: 'bg-indigo-950' },
        { label: 'Completed', value: analytics?.completedCalls || 0, icon: '✅', color: 'text-green-400', bg: 'bg-green-950' },
        { label: 'Qualified Leads', value: analytics?.qualifiedLeads || 0, icon: '🎯', color: 'text-purple-400', bg: 'bg-purple-950' },
        { label: 'Conversion Rate', value: `${analytics?.conversionRate || 0}%`, icon: '📈', color: 'text-amber-400', bg: 'bg-amber-950' },
        { label: 'Avg Duration', value: formatDuration(analytics?.avgDuration || 0), icon: '⏱', color: 'text-blue-400', bg: 'bg-blue-950' },
    ];

    return (
        <div className="flex min-h-screen bg-[#0f0f0f]">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Analytics</h1>
                        <p className="text-gray-500 mt-1">Session insights and performance metrics</p>
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-indigo-500 text-gray-300 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                        📥 Export CSV
                    </button>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-5 gap-4 mb-8">
                    {statCards.map((stat) => (
                        <div key={stat.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                            <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center text-xl mb-3`}>
                                {stat.icon}
                            </div>
                            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                            <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-6 mb-6">

                    {/* Calls per day chart */}
                    <div className="col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-6">Sessions — Last 7 Days</h2>
                        <div className="flex items-end justify-between gap-2 h-32">
                            {analytics?.callsPerDay?.map((day, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                    <span className="text-gray-500 text-xs">{day.count}</span>
                                    <div
                                        className="w-full bg-indigo-600 rounded-t-md transition-all hover:bg-indigo-500"
                                        style={{
                                            height: `${Math.max((day.count / maxCount) * BAR_MAX_HEIGHT, day.count > 0 ? 8 : 2)}px`,
                                            opacity: day.count === 0 ? 0.2 : 1
                                        }}
                                    />
                                    <span className="text-gray-600 text-xs text-center leading-tight">
                                        {day.date.split(',')[0]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Language breakdown */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-6">Language Breakdown</h2>
                        {analytics?.languages?.length === 0 ? (
                            <p className="text-gray-600 text-sm">No data yet</p>
                        ) : (
                            <div className="space-y-3">
                                {analytics?.languages?.map((lang, i) => {
                                    const pct = analytics.totalCalls > 0
                                        ? Math.round((lang.count / analytics.totalCalls) * 100)
                                        : 0;
                                    return (
                                        <div key={lang.language}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-gray-300 text-sm font-medium uppercase">
                                                    {lang.language}
                                                </span>
                                                <span className="text-gray-500 text-xs">{lang.count} ({pct}%)</span>
                                            </div>
                                            <div className="w-full bg-[#2a2a2a] rounded-full h-1.5">
                                                <div
                                                    className="h-1.5 rounded-full transition-all"
                                                    style={{
                                                        width: `${pct}%`,
                                                        backgroundColor: COLORS[i % COLORS.length]
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Qualified vs Unqualified */}
                        <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
                            <h3 className="text-white text-sm font-semibold mb-4">Lead Quality</h3>
                            <div className="flex gap-3">
                                <div className="flex-1 bg-green-950 border border-green-900 rounded-lg p-3 text-center">
                                    <p className="text-green-400 text-xl font-bold">{analytics?.qualifiedLeads || 0}</p>
                                    <p className="text-green-600 text-xs mt-1">Qualified</p>
                                </div>
                                <div className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3 text-center">
                                    <p className="text-gray-400 text-xl font-bold">
                                        {(analytics?.totalCalls || 0) - (analytics?.qualifiedLeads || 0)}
                                    </p>
                                    <p className="text-gray-600 text-xs mt-1">Unqualified</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick link to sessions */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-white font-semibold">View All Sessions</h2>
                        <p className="text-gray-500 text-sm mt-1">
                            See full transcripts, timelines and session details
                        </p>
                    </div>
                    <Link
                        to="/calls"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
                    >
                        View Sessions →
                    </Link>
                </div>
            </main>
        </div>
    );
}