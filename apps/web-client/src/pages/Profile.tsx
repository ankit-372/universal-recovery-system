import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyItems } from '../lib/api';
import { Calendar, Package, Search, LogOut } from 'lucide-react';

export function Profile() {
    const { user, logout } = useAuth();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMyItems()
            .then(({ data }) => setItems(data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (!user) return null;

    // Generate Initials (e.g., "Ankit Patel" -> "AP")
    const name = user.fullName || "User";
    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="max-w-6xl mx-auto mt-8 px-4 pb-20 font-sans">

            {/* 1. Profile Header Card */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col md:flex-row items-center gap-8 mb-12">
                {/* Avatar Circle */}
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-indigo-200">
                    {initials}
                </div>

                {/* User Info */}
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">{name}</h1>
                    <p className="text-slate-500 font-medium mb-6">{user.email}</p>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            {items.length} Items Uploaded
                        </div>
                        <button
                            onClick={logout}
                            className="bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition"
                        >
                            <LogOut className="w-4 h-4" /> Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. My Uploads Grid */}
            <div className="flex items-center gap-3 mb-6">
                <Package className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-slate-800">My Upload History</h2>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-400">Loading your items...</div>
            ) : items.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-slate-500 font-medium">You haven't uploaded anything yet.</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item) => (
                        <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-lg transition group">
                            <div className="relative h-48 mb-4 overflow-hidden rounded-xl">
                                <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />

                                {/* Badge: Lost vs Found */}
                                <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm uppercase ${item.isLost ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                                    }`}>
                                    {item.isLost ? 'Lost Item' : 'Found Item'}
                                </div>
                            </div>

                            <h4 className="font-bold text-slate-800 text-lg mb-1 truncate">{item.description}</h4>

                            <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                                {/* Optional Delete Button (Backend logic needed) */}
                                {/* <button className="hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button> */}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
