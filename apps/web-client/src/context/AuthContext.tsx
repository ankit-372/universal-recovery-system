import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { checkAuth, login as apiLogin, logout as apiLogout } from '../lib/api';

interface User {
    id: string;
    email: string;
    fullName: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Check Session on Mount
    useEffect(() => {
        checkAuth()
            .then(({ data }) => setUser(data))
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false));
    }, []);

    // 2. Login Wrapper
    const login = async (email: string, pass: string) => {
        await apiLogin(email, pass);
        const { data } = await checkAuth(); // Re-fetch user data
        setUser(data);
    };

    // 3. Logout Wrapper
    const logout = async () => {
        await apiLogout();
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};