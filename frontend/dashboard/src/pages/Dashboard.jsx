import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api';

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalCalls: 0,
        totalLeads: 0,
        readyProducts: 0
    });
    const [recentCalls, setRecentCalls] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const client = JSON.parse(localStorage.getItem('client') || '{}');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [productsRes, callsRes, leadsRes] = await Promise.all([
                api.get('/products'),
                api.get('/calls'),
                api.get('/calls/leads/all')
            ]);

            setProducts(productsRes.data);
            setRecentCalls(callsRes.data.slice(0, 5));
            setStats({
                totalProducts: productsRes.data.length,
                totalCalls: callsRes.data.length,
                totalLeads: leadsRes.data.length,
                readyProducts: productsRes.data.filter(p => p.explorationStatus === 'ready').length
            });
        } catch (err) {
            console.log('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        { label: 'Total Products', value: stats.totalProducts, icon: '⚙', color: 'text-indigo-400' },
        { label: 'Ready Products', value: stats.readyProducts, icon: '✅', color: 'text-green-400' },
        { label: 'Total Calls', value: stats.totalCalls, icon: '📞', color: 'text-blue-400' },
        { label: 'Leads Captured', value: stats.totalLeads, icon: '👤', color: 'text-purple-400' },
    ];

    return (
        <div className="flex min-h-screen bg-[#0f0f0f]">
            <Sidebar />

            <main className="flex-1 p-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">
                        Good day, {client.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-gray-500 mt-1">Here's what's happening with your AI agents</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {statCards.map((stat) => (
                        <div key={stat.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-2xl">{stat.icon}</span>
                            </div>
                            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                            <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-6">

                    {/* Products */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold text-white">Your Products</h2>
                            <Link to="/products/new" className="text-sm text-indigo-400 hover:text-indigo-300">
                                + Add new
                            </Link>
                        </div>

                        {loading ? (
                            <p className="text-gray-500 text-sm">Loading...</p>
                        ) : products.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500 text-sm mb-4">No products yet</p>
                                <Link
                                    to="/products/new"
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                                >
                                    Add your first product
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {products.slice(0, 5).map(product => (
                                    <Link
                                        key={product._id}
                                        to={`/products/${product._id}`}
                                        className="flex items-center justify-between p-3 bg-[#0f0f0f] rounded-lg hover:bg-[#252525] transition-colors"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-white">{product.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{product.url}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${product.explorationStatus === 'ready'
                                                ? 'bg-green-950 text-green-400'
                                                : product.explorationStatus === 'exploring'
                                                    ? 'bg-yellow-950 text-yellow-400'
                                                    : product.explorationStatus === 'failed'
                                                        ? 'bg-red-950 text-red-400'
                                                        : 'bg-gray-800 text-gray-400'
                                            }`}>
                                            {product.explorationStatus}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Calls */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold text-white">Recent Calls</h2>
                            <Link to="/calls" className="text-sm text-indigo-400 hover:text-indigo-300">
                                View all
                            </Link>
                        </div>

                        {loading ? (
                            <p className="text-gray-500 text-sm">Loading...</p>
                        ) : recentCalls.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500 text-sm">No calls yet</p>
                                <p className="text-gray-600 text-xs mt-2">Calls will appear here once visitors start demos</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentCalls.map(call => (
                                    <div
                                        key={call._id}
                                        className="flex items-center justify-between p-3 bg-[#0f0f0f] rounded-lg"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-white">
                                                {call.prospectName || 'Anonymous visitor'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {call.productId?.name} • {Math.floor(call.duration / 60)}m {call.duration % 60}s
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${call.status === 'completed'
                                                ? 'bg-green-950 text-green-400'
                                                : 'bg-yellow-950 text-yellow-400'
                                            }`}>
                                            {call.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}