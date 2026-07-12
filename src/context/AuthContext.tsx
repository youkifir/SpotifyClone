import { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react'
interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    avatar?: string | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    checkCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const login = (newToken: string, newUser: User) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const checkCurrentUser = async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const response = await fetch('http://localhost:5000/api/auth/me', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                // Предполагается, что бэк отдает юзера в объекте { success: true, data: user } или прямо объектом
                setUser(data.data || data);
            } else {
                logout();
            }
        } catch (error) {
            console.error('Ошибка проверки токена:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkCurrentUser();
    }, [token]);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, checkCurrentUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};