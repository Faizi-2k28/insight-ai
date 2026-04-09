"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch } from "@/lib/apiClient";

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    is_active?: boolean;
    created_at?: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
    signup: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: async () => ({ ok: false }),
    signup: async () => ({ ok: false }),
    logout: () => { },
});

const STORAGE_KEY_SESSION = "insight_session";
const STORAGE_KEY_TOKEN = "insight_access_token";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    /* Restore session */
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SESSION);
            const token = localStorage.getItem(STORAGE_KEY_TOKEN);
            if (raw && token) {
                setUser(JSON.parse(raw));
                // Optionally verify token with backend endpoint /api/auth/me here
            } else {
                setUser(null);
            }
        } catch { 
            setUser(null);
        }
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const data = await apiFetch("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });

            // Fallback for avatar mapping just to match frontend UI assumptions if any
            const sessionUser: User = { 
                id: data.user.id, 
                name: data.user.name, 
                email: data.user.email, 
                role: data.user.role, 
                avatar: data.user.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase() 
            };
            
            localStorage.setItem(STORAGE_KEY_TOKEN, data.access_token);
            localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
            setUser(sessionUser);
            
            return { ok: true };
        } catch (error: any) {
            return { ok: false, error: error.message || "Failed to login" };
        }
    };

    const signup = async (name: string, email: string, password: string) => {
        try {
            const data = await apiFetch("/api/auth/register", {
                method: "POST",
                body: JSON.stringify({ name, email, password })
            });

            const sessionUser: User = { 
                id: data.user.id, 
                name: data.user.name, 
                email: data.user.email, 
                role: data.user.role, 
                avatar: data.user.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase() 
            };
            
            localStorage.setItem(STORAGE_KEY_TOKEN, data.access_token);
            localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
            setUser(sessionUser);
            
            return { ok: true };
        } catch (error: any) {
            return { ok: false, error: error.message || "Failed to register" };
        }
    };

    const logout = async () => {
        try {
            const token = localStorage.getItem(STORAGE_KEY_TOKEN);
            if (token) {
                await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
            }
        } catch (e) {
            // ignore
        } finally {
            localStorage.removeItem(STORAGE_KEY_SESSION);
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
