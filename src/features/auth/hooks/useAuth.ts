import { useCallback, useEffect, useState } from "react";
import {
  getCurrentSession,
  isSupabaseConfigured,
  registerWithTemporaryPassword,
  resetPasswordForEmail,
  signInWithPassword,
  signOutUser,
  updateUserPassword,
} from "../services/authService";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const refreshSession = useCallback(async () => {
    try {
      setLoading(true);
      const s = await getCurrentSession();
      setSession(s);
      setUser(s?.user ?? null);
    } catch (err: any) {
      setError(err?.message || "Erreur de session");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await signInWithPassword(email, pass);
      if (res.error) {
        setError(res.error.message || "Identifiants invalides");
        return { success: false, error: res.error };
      }
      await refreshSession();
      return { success: true, data: res.data };
    } catch (err: any) {
      setError(err?.message || "Erreur de connexion");
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, [refreshSession]);

  const register = useCallback(async (email: string, name?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await registerWithTemporaryPassword(email, name);
      return res;
    } catch (err: any) {
      setError(err?.message || "Erreur d'inscription");
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await signOutUser();
      setSession(null);
      setUser(null);
    } catch (err: any) {
      setError(err?.message || "Erreur de déconnexion");
    } finally {
      setLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (newPass: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await updateUserPassword(newPass);
      return res;
    } catch (err: any) {
      setError(err?.message || "Erreur de mise à jour du mot de passe");
      return { error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await resetPasswordForEmail(email);
      return res;
    } catch (err: any) {
      setError(err?.message || "Erreur de réinitialisation");
      return { error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    session,
    loading,
    error,
    isConfigured: isSupabaseConfigured,
    login,
    register,
    logout,
    changePassword,
    sendPasswordReset,
    forgotPassword: sendPasswordReset,
    refreshSession,
  };
}
