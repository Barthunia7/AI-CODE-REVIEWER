'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [rawCode, setRawCode] = useState('');
  const [reviewType, setReviewType] = useState('paste');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Route guard protection ensures only signed-in profiles view this workspace
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!savedUser || !token) {
      router.push('/login');
    } else {
      setUser(JSON.parse(savedUser));
    }
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

      // Forward user down the pipeline to see their metrics breakdown output screen
      router.push(`/review/${data.reviewId}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

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

      {/* Primary Interactive Application Screen Workspace Grid */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8">
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-2">Submit Code for Audit</h2>
          <p className="text-slate-400 text-sm mb-6">Enter your code below to trigger instant static syntax checks and generative AI refactoring insights.</p>

          <form onSubmit={handleCodeSubmission} className="space-y-5">
            {/* Project Context Text Entry Box Input Row */}
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

            {/* Code Field Component Area */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 text-sm font-semibold">Source Code Editor Input</label>
                <span className="text-xs text-slate-500 font-mono">JavaScript / Node.js supported</span>
              </div>
              <textarea 
                required 
                rows={12}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-emerald-400 font-mono text-sm focus:outline-none focus:border-indigo-500 shadow-inner" 
                placeholder={`function calculateTotal(price, tax) {\n    const total = price + tax;\n    return total;\n}`}
                value={rawCode}
                onChange={(e) => setRawCode(e.target.value)}
              />
            </div>

            {/* Workflow Processing Trigger Core Application Button */}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full .bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold p-3.5 rounded-lg shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2"
              >
                {loading ? 'Analyzing Code Base Structure...' : 'Analyze Source Code Snippet'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
