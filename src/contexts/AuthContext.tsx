import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface UserProfile {
    id: string;
    role: 'admin' | 'operator' | 'support' | 'user';
    allowed_pages?: string[];
    full_name?: string;
    organization_id?: string;
    plan_id?: string;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
    isStarter: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
    isStarter: true,
    signOut: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Function to fetch profile
        const fetchProfile = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (data) {
                    setProfile(data);
                } else {
                    setProfile(null);
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            }
        };

        // 1. Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
            setLoading(false);
        });

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setProfile(null);
    }, []);

    // Helpers de plano
    const isAdmin = useMemo(() => user?.email === 'marketing@conectaperformance.com.br', [user?.email]);
    const isStarter = useMemo(() => {
        if (isAdmin) return false;
        return profile?.plan_id === 'starter' || !profile?.plan_id;
    }, [isAdmin, profile?.plan_id]);

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        session,
        user,
        profile,
        loading,
        isAdmin,
        isStarter,
        signOut
    }), [session, user, profile, loading, isAdmin, isStarter, signOut]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

