"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => { ok: boolean; error?: string };
    signup: (name: string, email: string, password: string) => { ok: boolean; error?: string };
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => ({ ok: false }),
    signup: () => ({ ok: false }),
    logout: () => { },
});

/* ---- Seed dummy users ---- */
const SEED_USERS = [
    { id: "u1", name: "Alex Johnson", email: "demo@insightai.io", password: "demo1234", role: "Data Analyst", avatar: "AJ" },
    { id: "u2", name: "Sarah Williams", email: "sarah@insightai.io", password: "sarah123", role: "Manager", avatar: "SW" },
    { id: "u3", name: "Dr. Omar Raza", email: "omar@insightai.io", password: "omar1234", role: "Educator", avatar: "OR" },
];

const STORAGE_KEY_USERS = "insight_users";
const STORAGE_KEY_SESSION = "insight_session";

function loadUsers() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_USERS);
        if (raw) return JSON.parse(raw) as typeof SEED_USERS;
    } catch { }
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(SEED_USERS));
    return SEED_USERS;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    /* Restore session */
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SESSION);
            if (raw) setUser(JSON.parse(raw));
        } catch { }
        /* Ensure seed users exist */
        const existing = localStorage.getItem(STORAGE_KEY_USERS);
        if (!existing) localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(SEED_USERS));
    }, []);

    const login = (email: string, password: string) => {
        const users = loadUsers();
        const found = users.find(
            (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );
        if (!found) return { ok: false, error: "Invalid email or password. Try demo@insightai.io / demo1234" };
        const sessionUser: User = { id: found.id, name: found.name, email: found.email, role: found.role, avatar: found.avatar };
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
        setUser(sessionUser);
        return { ok: true };
    };

    const signup = (name: string, email: string, password: string) => {
        const users = loadUsers();
        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
            return { ok: false, error: "An account with this email already exists." };
        const newUser = { id: `u${Date.now()}`, name, email, password, role: "Analyst", avatar: name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() };
        const updated = [...users, newUser];
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updated));
        const sessionUser: User = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, avatar: newUser.avatar };
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
        setUser(sessionUser);
        return { ok: true };
    };

    const logout = () => {
        localStorage.removeItem(STORAGE_KEY_SESSION);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
