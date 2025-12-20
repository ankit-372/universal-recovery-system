import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../lib/api'; // API call to create the user in DB
import { useAuth } from '../context/AuthContext'; // 🟦 Import Context for auto-login
import { User, Lock, Mail, Loader2 } from 'lucide-react';

export function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth(); // 🟦 Use global login function
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create Account (Backend Call)
      await signup(form);

      // 2. Auto Login (Context -> Sets HttpOnly Cookie)
      // We reuse the context login so the global state updates instantly
      await login(form.email, form.password);

      // 3. Redirect (Client-side)
      navigate('/upload'); 
    } catch (err: any) {
      // Check for specific backend error messages if available
      if (err.response && err.response.status === 409) {
        setError('This email is already registered.');
      } else {
        setError('Signup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl border border-slate-50">
      <div className="text-center mb-8">
        <div className="bg-indigo-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">🚀</div>
        <h2 className="text-2xl font-bold text-slate-800">Create Account</h2>
        <p className="text-slate-500 text-sm">Join the community to find lost items.</p>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm text-center border border-red-100 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Full Name</label>
          <div className="relative">
            <User className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              required
              className="w-full pl-11 p-3.5 bg-slate-50 border-none rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="John Doe"
              value={form.fullName}
              onChange={(e) => setForm({...form, fullName: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
            <input 
              type="email" 
              required
              className="w-full pl-11 p-3.5 bg-slate-50 border-none rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
            <input 
              type="password" 
              required
              className="w-full pl-11 p-3.5 bg-slate-50 border-none rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition flex justify-center shadow-lg shadow-indigo-200"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Create Account'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        Already have an account? <Link to="/login" className="text-indigo-600 font-bold hover:underline">Sign In</Link>
      </p>
    </div>
  );
}