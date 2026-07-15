'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReviewResultsPage({ params }) {
  const [review, setReview] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Baseline fallbacks tracking context
  let reviewId = '';

  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        const resolvedParams = await params;
        reviewId = resolvedParams.id;

        if (!reviewId) return;

        const token = localStorage.getItem('token');
        const reviewRes = await fetch(`http://localhost:5000/api/review/details/${reviewId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const reviewData = await reviewRes.json();
        
        if (!reviewRes.ok) throw new Error(reviewData.error);
        
        const mainReview = Array.isArray(reviewData.review) ? reviewData.review[0] : reviewData.review;
        setReview(mainReview);
        setFindings(reviewData.findings || []);
      } catch (err) {
        alert('Error loading analysis details: ' + err.message);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchReviewData();
  }, [params, router]);

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading complete security metrics report...</div>;
  if (!review) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Report profiles not found.</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between shadow-md">
        <h1 className="text-xl font-bold .bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Analysis Report Dashboard</h1>
        <button onClick={() => router.push('/dashboard')} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">
          ← Run Another Audit
        </button>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col items-center justify-center shadow-lg">
            <span className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">Overall Score</span>
            <div className={`text-5xl font-black rounded-full h-24 w-24 flex items-center justify-center border-4 ${review.overall_score >= 80 ? 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10' : review.overall_score >= 50 ? 'text-yellow-400 border-yellow-400/30 bg-yellow-500/10' : 'text-red-400 border-red-400/30 bg-red-500/10'}`}>
              {review.overall_score}
            </div>
          </div>
          
          <div className="md:col-span-2 bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-2">Executive Summary</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{review.summary || 'No overview summary logged for this project snippet.'}</p>
          </div>
        </div>

        {/* Day 13 Optimization: AI Generated Code Documentation Canvas with Download Utility */}
        {review.documentation && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  📝 Automated Code Documentation
                </h3>
                <p className="text-slate-400 text-xs font-sans">
                  AI-generated reference manuals detailing functional purpose, architectural structures, parameter matrices, and explicit return value targets.
                </p>
              </div>
              <button 
                onClick={async () => {
                  const resolvedParams = await params;
                  const currentId = resolvedParams.id || 'report';
                  const fileBlob = new Blob([review.documentation], { type: 'text/markdown;charset=utf-8;' });
                  const downloadLink = document.createElement('a');
                  downloadLink.href = URL.createObjectURL(fileBlob);
                  downloadLink.setAttribute('download', `documentation_review_${currentId}.md`);
                  document.body.appendChild(downloadLink);
                  downloadLink.click();
                  document.body.removeChild(downloadLink);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold px-4 py-2 rounded-lg transition shadow-md flex items-center gap-1.5 whitespace-nowrap self-start sm:self-center"
              >
                💾 Download Markdown File
              </button>
            </div>
            <pre className="bg-slate-950 border border-slate-900 text-emerald-400 p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap shadow-inner leading-relaxed">
              {review.documentation}
            </pre>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Identified Vulnerabilities & Issues ({findings.length})</h2>
          
          {findings.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center text-slate-400 text-sm">
              🎉 No significant bugs, architectural leaks, or style syntax errors found!
            </div>
          ) : (
            findings.map((item) => (
              <div key={item.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5 shadow-md flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-base font-bold text-white font-mono flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-sans uppercase ${item.severity === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : item.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                      {item.severity}
                    </span>
                    {item.issue}
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">Line: {item.line_number}</span>
                </div>
                
                <p className="text-slate-300 text-sm">{item.explanation}</p>
                
                {item.suggested_fix && (
                  <div className="mt-2">
                    <span className="block text-xs font-semibold text-slate-400 mb-1 font-mono">Suggested Code Fix Implementation:</span>
                    <pre className="bg-slate-950 border border-slate-800 text-emerald-400 p-3 rounded-lg font-mono text-xs overflow-x-auto shadow-inner">
                      {item.suggested_fix}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
