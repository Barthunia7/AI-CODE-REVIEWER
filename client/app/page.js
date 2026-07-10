export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-xl text-center">
        <h1 className="text-5xl font-extrabold mb-4 .bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          AI Code Reviewer
        </h1>
        <p className="text-slate-400 text-lg mb-8 max-w-md mx-auto">
          Automate your software quality audits with static compilation syntax rules and generative intelligence.
        </p>
        <div className="flex gap-4 justify-center">
          <a href="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-indigo-600/20 transition">
            Log In
          </a>
          <a href="/register" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-6 py-3 rounded-lg font-bold transition">
            Sign Up     
          </a>
        </div>
      </div>
    </div>
  );
}
