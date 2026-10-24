import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Bell } from 'lucide-react';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    onlineUsers: Set<string>;
    notifications: any[];
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
    const { user, token } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        if (!user) {
            if (socket) {
                socket.close();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const baseURL = apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`;
        const activeToken = token || localStorage.getItem('auth_token') || '';

        // Connect with authenticated JWT credentials and userId fallback
        const newSocket = io(baseURL, {
            withCredentials: true,
            auth: {
                token: activeToken,
            },
            query: {
                userId: user.id,
                token: activeToken,
            },
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            console.log("🟢 WebSocket connected successfully:", newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log("🔴 WebSocket disconnected:", reason);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.warn("⚠️ WebSocket connection error:", err.message);
            setIsConnected(false);
        });

        // Track Online Status
        newSocket.on('user_status', ({ userId, status }) => {
            setOnlineUsers((prev) => {
                const next = new Set(prev);
                status === 'online' ? next.add(userId) : next.delete(userId);
                return next;
            });
        });

        // Initialize Online Users List
        newSocket.on('online_users', (userIds: string[]) => {
            setOnlineUsers(new Set(userIds));
        });

        // Listen for Notifications
        newSocket.on('notification', (notif) => {
            setNotifications((prev) => [...prev, notif]);
            new Audio('/notification.mp3').play().catch(() => { });
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
            setIsConnected(false);
        };
    }, [user, token]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers, notifications }}>
            {children}

            {/* Global Notification Toast (Simple UI) */}
            {notifications.length > 0 && (
                <div className="fixed top-20 right-4 bg-white p-4 rounded-xl shadow-2xl border-l-4 border-indigo-600 animate-bounce z-50">
                    <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-indigo-600" />
                        <div>
                            <p className="font-bold text-sm">New Message</p>
                            <p className="text-xs text-slate-500">{notifications[notifications.length - 1].content}</p>
                        </div>
                        <button onClick={() => setNotifications([])} className="text-xs text-slate-400">Dismiss</button>
                    </div>
                </div>
            )}
        </SocketContext.Provider>
    );
}

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) throw new Error('useSocket must be used within SocketProvider');
    return context;
};