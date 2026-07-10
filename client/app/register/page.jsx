'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');
      
      router.push('/login');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-700">
        <h2 className="text-3xl font-extrabold text-white text-center mb-2">Create Account</h2>
        <p className="text-slate-400 text-center text-sm mb-6">Get started with automated AI reviews</p>
        
        {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg text-sm mb-4">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-1">Full Name</label>
            <input type="text" required className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500" placeholder="John Doe" onChange={(e) => setForm({...form, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-1">Email Address</label>
            <input type="email" required className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500" placeholder="you@example.com" onChange={(e) => setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-1">Password</label>
            <input type="password" required className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500" placeholder="••••••••" onChange={(e) => setForm({...form, password: e.target.value})} />
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-lg transition mt-6">Sign Up</button>
        </form>
        <p className="text-slate-400 text-sm text-center mt-4">Already registered? <a href="/login" className="text-indigo-400 hover:underline">Log in</a></p>
      </div>
    </div>
  );
}
