import {
  getCurrentSession,
  isSupabaseConfigured,
  registerWithTemporaryPassword,
  resetPasswordForEmail,
  signInWithPassword,
  signOutUser,
  updateUserPassword,
} from "@/lib/api";
import { checkRateLimit, resetRateLimit, sanitizeInput, validatePassword } from "@/lib/security";

export {
  getCurrentSession,
  isSupabaseConfigured,
  registerWithTemporaryPassword,
  resetPasswordForEmail,
  signInWithPassword,
  signOutUser,
  updateUserPassword,
  checkRateLimit,
  resetRateLimit,
  sanitizeInput,
  validatePassword,
};
