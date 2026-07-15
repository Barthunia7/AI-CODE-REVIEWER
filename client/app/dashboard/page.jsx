'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const [user, setUser] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [rawCode, setRawCode] = useState('');
    const [reviewType, setReviewType] = useState('paste');
    const [loading, setLoading] = useState(false);

    // Day 11 State Trackers
    const [history, setHistory] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('all');

    const router = useRouter();

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (!savedUser || !token) {
            router.push('/login');
            return;
        }

        const userData = JSON.parse(savedUser);
        setUser(userData);

        // Day 11 History Fetch: Automatically loads all past project reports for this user
        const fetchAuditHistory = async () => {
            // SAFE RECOVERY: Prevents the app from firing bad calls before user data hydrates
            if (!userData || !userData.id) return;

            try {
                const response = await fetch(`http://localhost:5000/api/review/history/${userData.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error("Server returned non-JSON data models");

                const data = await response.json();
                if (response.ok) setHistory(data.history || []);
            } catch (err) {
                console.error("Failed to populate history records:", err);
            }
        };


        fetchAuditHistory();
    }, [router]);

    const handleSignOut = () => {
        localStorage.clear();
        router.push('/login');
    };

    const handleCodeSubmission = async (e) => {
        e.preventDefault();
        if (!projectName || !rawCode) return alert('Please complete all form inputs.');

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/review/submit-review', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user.id || 1,
                    projectName,
                    reviewType,
                    rawCode,
                    fileName: 'main_snippet.js'
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed generating review');

            router.push(`/review/${data.reviewId}`);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };
    // Day 14 Optimization: Deletes a selected row and removes it from the UI instantly
    const handleDeleteReview = async (reviewId) => {
        if (!confirm("Are you sure you want to delete this specific code review history record?")) return;
        
        try {
            const token = localStorage.getItem('token');
            // FIXED ROUTE STRING: Using the exact prefixed path mounted by the backend server
            const response = await fetch(`http://localhost:5000/api/review/delete/${reviewId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to execute row deletion.");

            // Remove the deleted item from  local history state instantly without reload
            setHistory(prevHistory => prevHistory.filter(item => item.review_id !== reviewId));
        } catch (err) {
            alert("Error deleting record: " + err.message);
        }
    };

    // Day 11 Client Filtration Algorithm: Filters rows dynamically by text search or grade selectors
    const filteredHistory = history.filter(item => {
        const matchesSearch = item.project_name.toLowerCase().includes(searchTerm.toLowerCase());
        if (filterSeverity === 'all') return matchesSearch;
        if (filterSeverity === 'good') return matchesSearch && item.overall_score >= 80;
        if (filterSeverity === 'warning') return matchesSearch && item.overall_score >= 50 && item.overall_score < 80;
        if (filterSeverity === 'critical') return matchesSearch && item.overall_score < 50;
        return matchesSearch;
    });

    if (!user) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading session configuration...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
            {/* Top Banner Navigation Row Bar */}
            <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between shadow-md">
                <h1 className="text-xl font-bold .bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                    AI Code Reviewer Hub
                </h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-300">Welcome, <strong className="text-white">{user.name}</strong></span>
                    <button onClick={handleSignOut} className="bg-slate-700 hover:bg-red-600/20 hover:text-red-400 border border-slate-600 text-xs font-semibold px-3 py-1.5 rounded-md transition">
                        Sign Out
                    </button>
                </div>
            </header>
            {/* Main Workspace Layout */}
            <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 space-y-8">

                {/* Input Form Panel */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Submit Code for Audit</h2>
                    <p className="text-slate-400 text-sm mb-6">Enter your code below to trigger instant static syntax checks and generative AI refactoring insights.</p>

                    <form onSubmit={handleCodeSubmission} className="space-y-5">
                        <div>
                            <label className="block text-slate-300 text-sm font-semibold mb-1">Project Name</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                placeholder="e.g., e-commerce-api"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-slate-300 text-sm font-semibold">Source Code Editor Input</label>
                                <span className="text-xs text-slate-500 font-mono">JavaScript / Node.js supported</span>
                            </div>
                            <textarea
                                required
                                rows={10}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-emerald-400 font-mono text-sm focus:outline-none focus:border-indigo-500 shadow-inner"
                                placeholder="function calculateTotal(price, tax) { ... }"
                                value={rawCode}
                                onChange={(e) => setRawCode(e.target.value)}
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white font-bold p-3.5 rounded-lg shadow-lg transition flex items-center justify-center gap-2"
                            >
                                {loading ? 'Analyzing Code Base Structure...' : 'Analyze Source Code Snippet'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* ========================================================================= */}
                {/* DAY 11 LOG INTERFACE VIEW: Searchable Historical Audits Data Grid Table */}
                {/* ========================================================================= */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Workspace Audit Logs</h2>

                    {/* Controls Bar Filters Row */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <input
                            type="text"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            placeholder="🔍 Search past reports by project name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <select
                            className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                            value={filterSeverity}
                            onChange={(e) => setFilterSeverity(e.target.value)}
                        >
                            <option value="all">📊 All Scores Matrix</option>
                            <option value="good">🟢 Good Health (80-100)</option>
                            <option value="warning">🟡 Warnings Raised (50-79)</option>
                            <option value="critical">🔴 Critical Risks (0-49)</option>
                        </select>
                    </div>

                    {/* Render Table Content Target Loop */}
                    {filteredHistory.length === 0 ? (
                        <div className="text-center text-slate-500 text-sm py-12 border border-dashed border-slate-700 rounded-lg bg-slate-900/30">
                            No historical review log items match your current filtration layout parameters.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-700">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-700">
                                        <th className="p-3.5">Project Title Name</th>
                                        <th className="p-3.5">Submission Path</th>
                                        <th className="p-3.5">Audit Score</th>
                                        <th className="p-3.5">Generation Date</th>
                                        <th className="p-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {filteredHistory.map((item) => (
                                        <tr key={item.review_id} className="hover:bg-slate-700/30 transition">
                                            <td className="p-3.5 font-semibold text-white">{item.project_name}</td>
                                            <td className="p-3.5 font-mono text-slate-400 text-xs">
                                                <span className="bg-slate-900 px-2 py-0.5 rounded text-indigo-400 border border-slate-700">
                                                    {item.review_type}
                                                </span>
                                            </td>
                                            <td className="p-3.5 font-bold">
                                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${item.overall_score >= 80 ? 'text-emerald-400 bg-emerald-500/10' :
                                                    item.overall_score >= 50 ? 'text-yellow-400 bg-yellow-500/10' :
                                                        'text-red-400 bg-red-500/10'
                                                    }`}>
                                                    {item.overall_score} / 100
                                                </span>
                                            </td>
                                            <td className="p-3.5 text-slate-400 text-xs">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-3.5 text-right space-x-3">
                                                <button
                                                    onClick={() => router.push(`/review/${item.review_id}`)}
                                                    className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs hover:underline"
                                                >
                                                    View Report →
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReview(item.review_id)}
                                                    className="text-red-400 hover:text-red-300 font-semibold text-xs hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    )}
                </div>
            </main>
        </div>
    );
}
