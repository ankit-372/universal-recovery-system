import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import API from '../lib/api';
import { Send, Trash2 } from 'lucide-react';

export function Inbox() {
    const { socket, onlineUsers } = useSocket();
    const { user } = useAuth();

    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConvo, setActiveConvo] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    // 1. Load Conversation List
    useEffect(() => {
        API.get('/chat/conversations').then(({ data }) => setConversations(data));
    }, []);

    // 2. Join Room & Load Messages when clicking a chat
    useEffect(() => {
        if (!socket || !activeConvo) return;

        socket.emit('join_room', activeConvo);
        socket.emit('get_messages', activeConvo, (msgs: any[]) => setMessages(msgs));

        const handleMsg = (msg: any) => {
            // Only append if it belongs to this chat
            if (msg.conversationId === activeConvo) {
                setMessages(prev => [...prev, msg]);
            }
        };

        socket.on('receive_message', handleMsg);

        // Listen for deletes
        const handleDelete = (payload: { messageId: string, conversationId: string }) => {
            if (payload.conversationId === activeConvo) {
                setMessages(prev => prev.map(msg =>
                    msg.id === payload.messageId
                        ? { ...msg, content: '🚫 This message was deleted', isDeleted: true }
                        : msg
                ));
            }
        };
        socket.on('message_deleted', handleDelete);

        return () => {
            socket.off('receive_message', handleMsg);
            socket.off('message_deleted', handleDelete);
        };
    }, [activeConvo, socket]);

    // Scroll to bottom
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = () => {
        if (!newMessage.trim() || !socket || !activeConvo) return;

        // Extract the "Other User ID" from the conversation string
        // Format: chat_ITEMID_USERA_USERB
        const parts = activeConvo.split('_');
        const receiverId = parts[2] === user?.id ? parts[3] : parts[2]; // Simple logic

        socket.emit('send_message', {
            conversationId: activeConvo,
            content: newMessage,
            senderId: user?.id,
            receiverId: receiverId,
        });
        setNewMessage('');
    };

    return (
        <div className="flex h-[85vh] max-w-6xl mx-auto mt-4 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">

            {/* LEFT: Sidebar List */}
            <div className="w-1/3 border-r border-slate-100 bg-slate-50 flex flex-col">
                <div className="p-4 border-b border-slate-200 bg-white shadow-sm z-10">
                    <h2 className="font-bold text-xl text-slate-800">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                    {conversations.map((convo) => {
                        // Use the explicit otherUserId from backend instead of parsing the string
                        // logic: if I am the finder, other is receiver. Backend already calculated this for us.
                        const otherId = convo.otherUserId;
                        const isOnline = onlineUsers.has(otherId);

                        return (
                            <div
                                key={convo.conversationId}
                                onClick={() => setActiveConvo(convo.conversationId)}
                                className={`p-4 cursor-pointer hover:bg-white transition border-b border-slate-100 ${activeConvo === convo.conversationId ? 'bg-white border-l-4 border-indigo-600 shadow-sm' : ''}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-700 text-sm">{convo.otherUserName || "Unknown User"}</span>
                                        {isOnline && <div className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow-sm ring-1 ring-green-100" title="Online" />}
                                    </div>
                                </div>
                                <p className="text-slate-500 text-xs truncate mt-1">{convo.content}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT: Chat Area */}
            <div className="w-2/3 flex flex-col bg-white">
                {activeConvo ? (
                    <>
                        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 scroll-smooth">
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender?.id === user?.id;
                                return (
                                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group hover:bg-transparent`}>
                                        <div className={`flex items-center gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : ''}`}>
                                            <div className={`p-3 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'} ${msg.isDeleted ? 'italic opacity-60' : ''}`}>
                                                {msg.content}
                                            </div>
                                            {isMe && !msg.isDeleted && (
                                                <button
                                                    onClick={() => {
                                                        socket?.emit('delete_message', {
                                                            messageId: msg.id,
                                                            conversationId: activeConvo,
                                                            senderId: user?.id
                                                        });
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-red-500"
                                                    title="Delete message"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-white flex gap-3">
                            <input
                                className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                placeholder="Type your message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            />
                            <button onClick={handleSend} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition">
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center flex-col text-slate-300">
                        <Send className="w-16 h-16 mb-4 opacity-20" />
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}