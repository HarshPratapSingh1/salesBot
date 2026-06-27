import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api';

export default function Embed() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    const serverUrl = 'http://localhost:5000';

    const embedCode = `<script src="${serverUrl}/agent.js" data-product-id="${id}" data-server="${serverUrl}"></script>`;

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            const res = await api.get(`/products/${id}`);
            setProduct(res.data);
        } catch (err) {
            console.log('Error fetching product:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(embedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-[#0f0f0f]">
                <Sidebar />
                <main className="flex-1 p-8">
                    <p className="text-gray-500">Loading...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#0f0f0f]">
            <Sidebar />

            <main className="flex-1 p-8">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-1">
                        <Link to="/products" className="text-gray-500 hover:text-white text-sm">
                            Products
                        </Link>
                        <span className="text-gray-600">→</span>
                        <Link to={`/products/${id}`} className="text-gray-500 hover:text-white text-sm">
                            {product?.name}
                        </Link>
                        <span className="text-gray-600">→</span>
                        <span className="text-white text-sm">Embed Code</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Embed Code</h1>
                    <p className="text-gray-500 mt-1">
                        Add this one line of code to your website to activate the AI demo agent
                    </p>
                </div>

                <div className="max-w-2xl space-y-6">

                    {/* Status Check */}
                    {product?.explorationStatus !== 'ready' && (
                        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4">
                            <p className="text-yellow-400 text-sm font-medium">
                                ⚠️ Your product is still being explored. The embed will work once exploration is complete.
                            </p>
                        </div>
                    )}

                    {/* Embed Code */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-4">Your Embed Code</h2>
                        <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-4 mb-4">
                            <code className="text-indigo-400 text-sm break-all">
                                {embedCode}
                            </code>
                        </div>
                        <button
                            onClick={handleCopy}
                            className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors ${copied
                                    ? 'bg-green-600 text-white'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                        >
                            {copied ? '✅ Copied!' : '📋 Copy Embed Code'}
                        </button>
                    </div>

                    {/* How to use */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-4">How to add it</h2>
                        <div className="space-y-4">
                            {[
                                { step: '01', title: 'Copy the embed code above', desc: 'Click the copy button to copy the one-line script tag' },
                                { step: '02', title: 'Paste before </body> tag', desc: 'Open your website\'s HTML and paste the code just before the closing body tag' },
                                { step: '03', title: 'That\'s it!', desc: 'A "Live Demo" button will appear on your website. Visitors click it to start a live AI demo' },
                            ].map(item => (
                                <div key={item.step} className="flex gap-4">
                                    <span className="text-indigo-500 font-bold text-sm w-8 shrink-0">{item.step}</span>
                                    <div>
                                        <p className="text-white text-sm font-medium">{item.title}</p>
                                        <p className="text-gray-500 text-xs mt-1">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-4">What visitors will see</h2>
                        <div className="bg-[#0f0f0f] rounded-lg p-8 relative min-h-32 flex items-center justify-center">
                            <p className="text-gray-600 text-sm">Your website content here</p>
                            <div className="absolute bottom-4 right-4 bg-indigo-600 text-white px-4 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                Live Demo
                            </div>
                        </div>
                        <p className="text-gray-500 text-xs mt-3 text-center">
                            A floating "Live Demo" button appears on your website
                        </p>
                    </div>

                </div>
            </main>
        </div>
    );
}