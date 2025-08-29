import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSQLiteContext } from 'expo-sqlite';
import { pushAllEntries, pullAllEntries } from '../database/sync';
import { pushAllReports } from '../database/reportsSync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { clearAllEntries as clearAllEntriesAction } from '../store/slices/journalSlice';
import { resetToDefaults } from '../store/slices/settingsSlice';
import { persistor } from '../store';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error?: string; session?: Session | null }>; // returns session when email confirmation is disabled
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const db = useSQLiteContext();
  const lastPushedUserIdRef = useRef<string | null>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((
      _event: AuthChangeEvent,
      newSession: Session | null
    ) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Push local entries and reports to cloud when session becomes available or user changes
  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (!userId) return;
    if (lastPushedUserIdRef.current === userId) return; // avoid duplicate push for same user
    lastPushedUserIdRef.current = userId;

    (async () => {
      try {
        await pushAllEntries(db);
      } catch (e) {
        console.warn('☁️ Sync: pushAllEntries failed', e);
      }

      try {
        await pushAllReports(db);
      } catch (e) {
        console.warn('☁️ Sync: pushAllReports failed', e);
      }

      try {
        await pullAllEntries(db);
      } catch (e) {
        console.warn('☁️ Sync: pullAllEntries failed', e);
      }
    })();
  }, [session, db]);

  // Reset last pushed user marker on sign-out
  useEffect(() => {
    if (!session?.user?.id) {
      lastPushedUserIdRef.current = null;
    }
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    signIn: async (email: string, password: string) => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        return {};
      } catch (e: any) {
        return { error: e?.message ?? 'Failed to sign in' };
      }
    },
    signUp: async (email: string, password: string, firstName?: string, lastName?: string) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });
        if (error) return { error: error.message };
        return { session: data.session ?? null };
      } catch (e: any) {
        return { error: e?.message ?? 'Failed to sign up' };
      }
    },
    signOut: async () => {
      // Sign out of Supabase (clears auth session persisted via AsyncStorage)
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Auth signOut failed (proceeding to clear local data anyway)', e);
      }

      // Clear local SQLite data: journals and reports
      try {
        await db.execAsync('DELETE FROM journal_entries;');
      } catch (e) {
        console.warn('Failed to clear journal_entries table', e);
      }

      try {
        await db.execAsync('DELETE FROM reports;');
      } catch (e) {
        // The reports table may not exist yet; ignore if so
        console.warn('Failed to clear reports table (may not exist yet)', e);
      }

      // Clear Redux journal slice and its persisted storage without affecting settings
      try {
        dispatch(clearAllEntriesAction());
        dispatch(resetToDefaults());
        await AsyncStorage.multiRemove(['persist:journal', 'persist:settings']);
        await persistor.purge();
      } catch (e) {
        console.warn('Failed to clear persisted Redux journal state', e);
      }
    },
  }), [session, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
