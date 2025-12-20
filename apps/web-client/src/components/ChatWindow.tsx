import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext'; // ✅ Reuse Global Socket
import { Send, X, MessageSquare, Trash2 } from 'lucide-react';

interface ChatProps {
  itemId: string;
  finderId: string;
  currentUserId: string;
  onClose: () => void;
}

export function ChatWindow({ itemId, finderId, currentUserId, onClose }: ChatProps) {
  const { socket } = useSocket(); // ✅ Reuse connection
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // 🔒 SECURE ID GENERATION
  // We explicitly label the Seeker vs Finder to prevent ANY collision.
  // Room ID: chat_item_ITEMID_finder_FINDERID_seeker_SEEKERID
  const conversationId = `chat_item_${itemId}_finder_${finderId}_seeker_${currentUserId}`;

  useEffect(() => {
    if (!socket) return;

    console.log("🔌 Joining Room:", conversationId);

    // 1. Join the unique room
    socket.emit('join_room', conversationId);

    // 2. Load History
    socket.emit('get_messages', conversationId, (history: any[]) => {
      console.log("📜 History Loaded:", history.length);
      setMessages(history);
    });

    // 3. Listen for real-time messages
    const handleMessage = (msg: any) => {
      // Only add if it belongs to THIS room
      if (msg.conversationId === conversationId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('receive_message', handleMessage);

    // Listen for deletes
    const handleDelete = (payload: { messageId: string, conversationId: string }) => {
      if (payload.conversationId === conversationId) {
        setMessages(prev => prev.map(msg =>
          msg.id === payload.messageId
            ? { ...msg, content: '🚫 This message was deleted', isDeleted: true }
            : msg
        ));
      }
    };
    socket.on('message_deleted', handleDelete);

    // Cleanup: Leave room logic (optional) or just remove listener
    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('message_deleted', handleDelete);
    };
  }, [socket, conversationId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim() || !socket) return;

    // Send to backend
    socket.emit('send_message', {
      conversationId,
      content: newMessage,
      senderId: currentUserId,
      receiverId: finderId, // Needed for notification
    });
    setNewMessage('');
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 animate-fade-in-up font-sans">
      {/* Header */}
      <div className="bg-indigo-600 p-4 rounded-t-2xl text-white flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <div className="flex flex-col">
            <span className="font-bold text-sm">Chat with Finder</span>
            <span className="text-[10px] opacity-75">ID: {conversationId.slice(-6)}</span>
          </div>
        </div>
        <button onClick={onClose} className="hover:bg-indigo-500 p-1 rounded-full transition">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 text-xs mt-10">
            <p>This is the start of your conversation.</p>
            <p>Say hello! 👋</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.sender?.id === currentUserId || msg.sender?.id === undefined; // Handle local echo if needed
          return (
            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group hover:bg-transparent`}>
              <div className={`flex items-center gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className={`p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'} ${msg.isDeleted ? 'italic opacity-60' : ''}`}>
                  {msg.content}
                </div>
                {isMe && !msg.isDeleted && (
                  <button
                    onClick={() => {
                      socket?.emit('delete_message', {
                        messageId: msg.id,
                        conversationId,
                        senderId: currentUserId
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

      {/* Input Area */}
      <div className="p-3 border-t bg-white flex gap-2">
        <input
          className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition shadow-md"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}