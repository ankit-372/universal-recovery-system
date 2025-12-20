import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // 🟦 1. Import Context Hook
import { Lock, Mail, Loader2 } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth(); // 🟦 2. Use the global login function
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 🟦 3. Use Context Login
      // This automatically sets the HttpOnly cookie and updates the global 'user' state
      await login(form.email, form.password);

      // 🟦 4. Client-side Redirect (Faster than window.location)
      // Note: Change '/upload' to '/report-found' if that is your preferred home page
      navigate('/upload');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl border border-slate-50">
      <div className="text-center mb-8">
        <div className="bg-indigo-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">🔐</div>
        <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
        <p className="text-slate-500 text-sm">Sign in to report items and chat.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm text-center border border-red-100 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
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
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="flex justify-end mt-2">
            <Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition flex justify-center shadow-lg shadow-indigo-200"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        Don't have an account? <Link to="/signup" className="text-indigo-600 font-bold hover:underline">Sign Up</Link>
      </p>
    </div>
  );
}