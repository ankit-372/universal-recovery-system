import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { checkAuth, login as apiLogin, logout as apiLogout } from '../lib/api';

interface User {
    id: string;
    email: string;
    fullName: string;
    token?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
    const [isLoading, setIsLoading] = useState(true);

    // 1. Check Session on Mount
    useEffect(() => {
        checkAuth()
            .then(({ data }) => {
                setUser(data);
                if (data.token) {
                    setToken(data.token);
                    localStorage.setItem('auth_token', data.token);
                }
            })
            .catch(() => {
                setUser(null);
                setToken(null);
                localStorage.removeItem('auth_token');
            })
            .finally(() => setIsLoading(false));
    }, []);

    // 2. Login Wrapper
    const login = async (email: string, pass: string) => {
        const { data: loginRes } = await apiLogin(email, pass);
        if (loginRes.access_token) {
            setToken(loginRes.access_token);
            localStorage.setItem('auth_token', loginRes.access_token);
        }
        const { data } = await checkAuth(); // Re-fetch user data
        setUser(data);
        if (data.token) {
            setToken(data.token);
            localStorage.setItem('auth_token', data.token);
        }
    };

    // 3. Logout Wrapper
    const logout = async () => {
        try {
            await apiLogout();
        } finally {
            setUser(null);
            setToken(null);
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};