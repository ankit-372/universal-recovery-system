import { useState } from 'react';
import API from '../lib/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [pass, setPass] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return alert("Invalid Token");

        setLoading(true);
        try {
            await API.post('/auth/reset-password', { token, newPass: pass });
            alert("Password reset successfully!");
            navigate('/login');
        } catch (err) {
            alert("Token invalid or expired.");
        } finally {
            setLoading(false);
        }
    };

    if (!token) return <div className="text-center mt-20">Invalid Reset Link</div>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Set New Password</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Reseting...' : 'Confirm New Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
