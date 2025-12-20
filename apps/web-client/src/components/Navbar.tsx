import { Link } from 'react-router-dom';
import { Search, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // 🟦 Import the Auth Hook

export function Navbar() {
  // 🟦 Use global state instead of localStorage
  // This automatically knows if the user is logged in via the HttpOnly cookie check
  const { isAuthenticated } = useAuth();


  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-indigo-600 flex items-center gap-2">
          🚀 RecoveryAI
        </Link>

        <div className="flex items-center gap-6">
          <Link to="/search" className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium text-sm transition">
            <Search className="w-4 h-4" /> Home
          </Link>
          <Link to="/inbox" className="...">Messages</Link>

          <Link to="/upload" className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium text-sm transition">
            <Upload className="w-4 h-4" /> Lost Something?
          </Link>

          <div className="h-6 w-px bg-slate-200 mx-2"></div>

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              {/* Profile Link */}
              <Link to="/profile" className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs hover:ring-2 hover:ring-indigo-500 transition">
                ME
              </Link>
            </div>
          ) : (
            <div className="flex gap-4">
              <Link to="/login" className="text-slate-600 hover:text-indigo-600 font-medium text-sm transition">Login</Link>
              <Link to="/signup" className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}