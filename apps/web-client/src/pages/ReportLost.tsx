import { useState } from 'react';
import { Upload, Search, MapPin, MessageSquare } from 'lucide-react';
import { uploadItem, getProxyImageUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ChatWindow } from '../components/ChatWindow';

export function ReportLost() {
    const [file, setFile] = useState<File | null>(null);
    const [desc, setDesc] = useState('');
    const [matches, setMatches] = useState<any[]>([]);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);

    // State to track which chat window is open
    const [activeChat, setActiveChat] = useState<{ itemId: string, finderId: string } | null>(null);

    // Use the global Auth Context
    const { user } = useAuth();
    const myUserId = user?.id;

    const handleFindMatches = async () => {
        if (!file) return;
        setLoading(true);
        setSearched(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', desc || 'Lost item search');
        formData.append('type', 'lost');

        try {
            const { data } = await uploadItem(formData);
            setMatches(data.matches || []);
        } catch (e) {
            console.error(e);
            alert("Search failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto mt-8 px-4 pb-20 relative">

            {/* 🟢 THE CHAT WINDOW (Renders if active) */}
            {activeChat && myUserId && (
                <ChatWindow
                    itemId={activeChat.itemId}
                    finderId={activeChat.finderId}
                    currentUserId={myUserId}
                    onClose={() => setActiveChat(null)}
                />
            )}

            {/* Hero Card */}
            <div className="bg-indigo-600 rounded-[2rem] p-8 md:p-12 text-white flex flex-col md:flex-row items-center gap-10 shadow-2xl shadow-indigo-200 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>

                <div className="flex-1 relative z-10">
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">Lost something?</h1>
                    <p className="text-indigo-100 text-lg leading-relaxed mb-8 opacity-90">
                        Upload a photo of what you lost. Our AI will scan the "Found" gallery to find visually similar items for you.
                    </p>

                    <textarea
                        className="w-full mb-4 p-3 rounded-xl bg-white/10 border border-indigo-400 text-white placeholder-indigo-200 outline-none focus:bg-white/20 transition"
                        placeholder="Optional description (e.g. Blue wallet)"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                    />

                    <div className="flex gap-4 items-center flex-wrap">
                        <div className="relative w-full md:w-auto h-14 px-6 bg-indigo-500 rounded-xl border-2 border-indigo-400 border-dashed flex items-center justify-center cursor-pointer hover:bg-indigo-400 transition group">
                            <input
                                type="file"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="flex items-center gap-2 text-indigo-100 group-hover:text-white font-medium">
                                <Upload className="w-5 h-5" />
                                <span>{file ? file.name.slice(0, 15) + '...' : 'Upload Photo'}</span>
                            </div>
                        </div>
                        <button
                            onClick={handleFindMatches}
                            disabled={loading || !file}
                            className="flex-1 md:flex-none bg-white text-indigo-600 px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-50 transition disabled:opacity-50 shadow-lg"
                        >
                            {loading ? 'Scanning Gallery...' : 'Find Matches'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Match Results Section */}
            {searched && (
                <div className="mt-16 animate-fade-in-up">
                    <div className="flex items-center gap-3 mb-8">
                        <Search className="w-6 h-6 text-slate-400" />
                        <h3 className="text-xl font-bold text-slate-800">
                            {matches.length > 0 ? `We found ${matches.length} potential matches` : "No matches yet. We saved your request!"}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {matches.map(item => (
                            <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition duration-300">
                                <div className="relative h-48 mb-4 overflow-hidden rounded-xl">
                                    <img src={getProxyImageUrl(item.imageUrl)} className="w-full h-full object-cover" crossOrigin="anonymous" />
                                    <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-sm">
                                        {Math.round((item.score || 0) * 100)}% MATCH
                                    </div>
                                </div>

                                <h4 className="font-bold text-slate-800 text-lg mb-1">{item.description}</h4>
                                <div className="flex items-center gap-1 text-slate-400 text-xs mb-4">
                                    <MapPin className="w-3 h-3" />
                                    <span>Item ID: {item.id.slice(0, 8)}</span>
                                </div>

                                <button
                                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                                    onClick={() => {
                                        if (item.user && item.user.id) {
                                            setActiveChat({ itemId: item.id, finderId: item.user.id });
                                        } else {
                                            alert("Cannot chat: Finder details missing on this item.");
                                        }
                                    }}
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Chat with Finder
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}