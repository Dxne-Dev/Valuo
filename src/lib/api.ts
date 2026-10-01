import { supabase, isSupabaseConfigured } from "./supabase";
export { isSupabaseConfigured };
import {
  type AppNotification,
  avatars,
  type FeedPost,
  type GroupData,
  type GroupMember,
  media,
  type UserProfile,
} from "../data";
import {
  checkRateLimit,
  generateSecureTemporaryPassword,
  resetRateLimit,
  sanitizeInput,
} from "./security";

// ============================================================================
// 1. AUTHENTICATION & PROFILE
// ============================================================================

// Generate a cryptographically strong temporary password
export function generateTemporaryPassword() {
  return generateSecureTemporaryPassword();
}

export async function getCurrentSession() {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

import { sendValuoWelcomeEmail } from "./emailService";

export async function registerWithTemporaryPassword(email: string, name?: string) {
  const cleanEmail = email.trim().toLowerCase();
  
  // Rate limiting check
  const rateLimit = checkRateLimit(`register_${cleanEmail}`, 3, 60000);
  if (!rateLimit.allowed) {
    return {
      data: null,
      error: { message: `Trop de tentatives. Réessayez dans ${rateLimit.retryAfterSeconds}s.` },
      tempPassword: "",
      isMock: false,
    };
  }

  const tempPassword = generateSecureTemporaryPassword();
  const userName = sanitizeInput(name?.trim() || splitEmail(cleanEmail));
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const activationUrl = `${origin}?mode=login&email=${encodeURIComponent(cleanEmail)}`;

  if (isSupabaseConfigured) {
    // 1. Verify if email already exists in auth.users or profiles
    try {
      const { data: exists } = await supabase.rpc("check_email_exists", { p_email: cleanEmail });
      if (exists) {
        return {
          data: null,
          error: { message: "Cette adresse email est déjà associée à un compte. Veuillez vous connecter." },
          tempPassword: "",
          isMock: false,
        };
      }
    } catch {
      // Fallback direct check on profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (profile) {
        return {
          data: null,
          error: { message: "Cette adresse email est déjà associée à un compte. Veuillez vous connecter." },
          tempPassword: "",
          isMock: false,
        };
      }
    }

    // 2. Perform Supabase Sign Up
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: tempPassword,
      options: {
        data: {
          name: userName,
          needs_password_change: true,
          temp_password_created_at: Date.now(),
        },
        emailRedirectTo: activationUrl,
      },
    });

    if (error) {
      return { data: null, error, tempPassword: "", isMock: false };
    }

    // Supabase anti-enumeration check (if user exists, identities is empty)
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        data: null,
        error: { message: "Cette adresse email est déjà associée à un compte. Veuillez vous connecter." },
        tempPassword: "",
        isMock: false,
      };
    }

    // 3. Dispatch welcome email ONLY when user creation is confirmed
    await sendValuoWelcomeEmail({
      email: cleanEmail,
      name: userName,
      tempPassword,
      activationUrl,
    });

    return { data, error: null, tempPassword, isMock: false };
  }

  // Local simulation fallback
  await sendValuoWelcomeEmail({
    email: cleanEmail,
    name: userName,
    tempPassword,
    activationUrl,
  });

  return { data: null, error: null, tempPassword, isMock: true };
}

export async function signInWithPassword(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();

  // Rate limiting check
  const rateLimit = checkRateLimit(`login_${cleanEmail}`, 5, 60000);
  if (!rateLimit.allowed) {
    return {
      data: null,
      error: { message: `Trop de tentatives de connexion. Réessayez dans ${rateLimit.retryAfterSeconds}s.` },
      isMock: false,
    };
  }

  if (!isSupabaseConfigured) {
    return { data: null, error: null, isMock: true };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: password.trim(),
  });

  if (!error) {
    resetRateLimit(`login_${cleanEmail}`);
  }

  return { data, error, isMock: false };
}

export async function updateUserPassword(newPassword: string) {
  if (!isSupabaseConfigured) return { error: null };

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
    data: {
      needs_password_change: false,
    },
  });

  return { data, error };
}

export async function resetPasswordForEmail(email: string) {
  if (!isSupabaseConfigured) return { error: null };
  return await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
}

function splitEmail(email: string) {
  return email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);
}

export async function signInWithOtp(emailOrPhone: string) {
  if (!isSupabaseConfigured) {
    return { error: null, isMock: true };
  }

  const isEmail = emailOrPhone.includes("@");
  if (isEmail) {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: emailOrPhone,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { data, error, isMock: false };
  } else {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: emailOrPhone,
    });
    return { data, error, isMock: false };
  }
}

export async function verifyOtp(emailOrPhone: string, token: string) {
  if (!isSupabaseConfigured) return { data: null, error: null };
  const isEmail = emailOrPhone.includes("@");
  if (isEmail) {
    return await supabase.auth.verifyOtp({
      email: emailOrPhone,
      token,
      type: "email",
    });
  } else {
    return await supabase.auth.verifyOtp({
      phone: emailOrPhone,
      token,
      type: "sms",
    });
  }
}

export async function signOutUser() {
  if (!isSupabaseConfigured) {
    localStorage.removeItem("valuo_demo_user");
    return;
  }
  await supabase.auth.signOut();
  localStorage.removeItem("valuo_demo_user");
  localStorage.removeItem("valuo_temp_password_notice");
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) {
    const cached = typeof window !== "undefined" ? localStorage.getItem(`valuo_user_profile_${userId}`) : null;
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return null;
  }

  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const { data: authData } = await supabase.auth.getUser();
    const meta = authData?.user?.user_metadata;

    // Security: Admin rights strictly determined by Supabase DB / verified metadata
    const isAdmin = Boolean(
      data?.is_admin === true ||
      meta?.is_admin === true
    );

    const effectiveName = data?.name || meta?.name || "Joueur VALUO";
    const effectiveCity = data?.city || meta?.city || "France";
    const effectiveAvatar = data?.avatar_url || meta?.avatar_url || avatars.lea;

    const fetchedProfile: UserProfile = {
      name: effectiveName,
      city: effectiveCity,
      bio: data?.bio || "",
      avatar: effectiveAvatar,
      cover: data?.cover_url || "https://images.pexels.com/photos/8099796/pexels-photo-8099796.jpeg",
      memberSince: data?.member_since || "Septembre 2026",
      isAdmin,
    };

    return fetchedProfile;
  } catch (e) {
    console.warn("fetchUserProfile error:", e);
    return null;
  }
}

export async function saveUserProfile(userId: string, profile: Partial<UserProfile>) {
  // Update localStorage immediately so UI is updated without lag or wipeout
  let mergedProfile: Partial<UserProfile> = { ...profile };
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(`valuo_user_profile_${userId}`);
    if (cached) {
      try {
        mergedProfile = { ...JSON.parse(cached), ...profile };
      } catch {}
    }
    localStorage.setItem(`valuo_user_profile_${userId}`, JSON.stringify(mergedProfile));
  }

  if (!isSupabaseConfigured) return;

  const updateFields: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (mergedProfile.name !== undefined) updateFields.name = sanitizeInput(mergedProfile.name);
  if (mergedProfile.city !== undefined) updateFields.city = sanitizeInput(mergedProfile.city);
  if (mergedProfile.bio !== undefined) updateFields.bio = sanitizeInput(mergedProfile.bio);
  if (mergedProfile.avatar !== undefined) updateFields.avatar_url = mergedProfile.avatar;
  if (mergedProfile.cover !== undefined) updateFields.cover_url = mergedProfile.cover;
  if (mergedProfile.isAdmin !== undefined) updateFields.is_admin = mergedProfile.isAdmin;

  try {
    // 0. Also sync to Auth User metadata directly (guaranteed write even without table RLS)
    await supabase.auth.updateUser({
      data: {
        name: mergedProfile.name,
        city: mergedProfile.city,
        avatar_url: mergedProfile.avatar,
        customized: true,
      },
    });

    // 1. Try UPDATE directly on profiles table
    const { data: updatedRows, error: updateError } = await supabase
      .from("profiles")
      .update(updateFields)
      .eq("id", userId)
      .select();

    if (updateError || !updatedRows || updatedRows.length === 0) {
      // 2. Fallback upsert
      const upsertPayload = { id: userId, ...updateFields };
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(upsertPayload, { onConflict: "id" });
      if (upsertError) {
        console.warn("Supabase profiles upsert warning:", upsertError);
      }
    }
  } catch (err) {
    console.warn("Supabase profiles save exception:", err);
  }
}

// ============================================================================
// 2. DAILY CHALLENGE & FEED POSTS
// ============================================================================

export type ChallengeData = {
  id?: string | number;
  theme: string;
  date: string;
  brief: string;
  remaining?: string;
  starts_at?: string;
  ends_at?: string;
  status?: "draft" | "scheduled" | "active" | "completed" | "archived";
  created_at?: string;
};

export async function deactivateActiveChallenge(challengeId?: string | number) {
  if (!isSupabaseConfigured) return;
  const query = supabase
    .from("daily_challenges")
    .update({ active: false, status: "completed" });

  const { error } = challengeId
    ? await query.eq("id", challengeId)
    : await query.eq("active", true);

  if (error) {
    console.error("deactivateActiveChallenge error:", error);
    throw new Error(error.message || "Erreur lors du retrait du défi");
  }
}

export async function fetchActiveChallenge(): Promise<ChallengeData | null> {
  if (isSupabaseConfigured) {
    try {
      const nowIso = new Date().toISOString();

      // 1. First look for an explicit active challenge whose ends_at is in the future
      const { data: activeList, error } = await supabase
        .from("daily_challenges")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.warn("fetchActiveChallenge DB error:", error);
      }

      let chosen = activeList?.find(
        (c) => !c.ends_at || new Date(c.ends_at).getTime() > Date.now()
      );

      // 2. If no valid active challenge found, check if a scheduled challenge has started
      if (!chosen) {
        const { data: scheduled } = await supabase
          .from("daily_challenges")
          .select("*")
          .eq("status", "scheduled")
          .lte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (scheduled) {
          // Auto-promote scheduled challenge to active
          await supabase
            .from("daily_challenges")
            .update({ status: "active", active: true })
            .eq("id", scheduled.id);
          chosen = { ...scheduled, status: "active", active: true };
        }
      }

      // 3. Fallback: take most recent challenge if activeList has entries
      if (!chosen && activeList && activeList.length > 0) {
        chosen = activeList[0];
      }

      if (chosen) {
        return {
          id: chosen.id,
          theme: chosen.theme,
          date: new Date(chosen.starts_at || chosen.date).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }),
          brief: chosen.brief,
          remaining: chosen.remaining || "6 h 24",
          starts_at: chosen.starts_at || chosen.created_at,
          ends_at: chosen.ends_at || undefined,
          status: chosen.status || (chosen.active ? "active" : "completed"),
          created_at: chosen.created_at,
        };
      }

      return null;
    } catch (err) {
      console.warn("fetchActiveChallenge network error:", err);
      return null;
    }
  }

  return null;
}

export async function fetchAllChallengesList(): Promise<ChallengeData[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("daily_challenges")
      .select("*")
      .order("starts_at", { ascending: false });

    if (error || !data) return [];

    return data.map((d) => ({
      id: d.id,
      theme: d.theme,
      date: new Date(d.starts_at || d.date).toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      brief: d.brief,
      remaining: d.remaining || "",
      starts_at: d.starts_at || d.created_at,
      ends_at: d.ends_at || undefined,
      status: d.status || (d.active ? "active" : "completed"),
      created_at: d.created_at,
    }));
  } catch (err) {
    console.warn("fetchAllChallengesList error:", err);
    return [];
  }
}

export async function saveActiveChallenge(
  challenge: Partial<ChallengeData>,
  options?: {
    isScheduled?: boolean;
    startsAt?: string;
    endsAt?: string;
  }
) {
  if (isSupabaseConfigured) {
    const isScheduled = options?.isScheduled ?? (challenge.status === "scheduled");
    const startsAt = options?.startsAt || challenge.starts_at || new Date().toISOString();
    
    // Default ends_at = 24h after starts_at or end of day if not specified
    let endsAt = options?.endsAt || challenge.ends_at;
    if (!endsAt) {
      const startDate = new Date(startsAt);
      startDate.setHours(startDate.getHours() + 24);
      endsAt = startDate.toISOString();
    }

    const todayDateStr = new Date(startsAt).toISOString().split("T")[0];
    const challengeStatus = isScheduled ? "scheduled" : "active";

    // If publishing an immediate active challenge, mark existing active ones as completed
    if (!isScheduled) {
      await supabase
        .from("daily_challenges")
        .update({ active: false, status: "completed" })
        .eq("active", true);
    }

    if (challenge.id) {
      // UPDATE existing challenge
      const { data, error: updateErr } = await supabase
        .from("daily_challenges")
        .update({
          theme: challenge.theme,
          brief: challenge.brief,
          active: !isScheduled,
          status: challengeStatus,
          starts_at: startsAt,
          ends_at: endsAt,
          date: todayDateStr,
        })
        .eq("id", challenge.id)
        .select()
        .single();

      if (updateErr) {
        console.error("CRITICAL: Supabase update daily_challenges failed:", updateErr);
        throw new Error(updateErr.message || "Écriture refusée par Supabase");
      }

      return data;
    } else {
      // INSERT new challenge
      const { data, error: insertErr } = await supabase
        .from("daily_challenges")
        .insert({
          theme: challenge.theme,
          brief: challenge.brief,
          active: !isScheduled,
          status: challengeStatus,
          starts_at: startsAt,
          ends_at: endsAt,
          date: todayDateStr,
        })
        .select()
        .single();

      if (insertErr) {
        console.error("CRITICAL: Supabase insert daily_challenges failed:", insertErr);
        throw new Error(insertErr.message || "Écriture refusée par Supabase");
      }

      return data;
    }
  }
}

export async function activateChallengeNow(challengeId: string | number) {
  if (!isSupabaseConfigured) return;

  // 1. Mark current active challenges as completed
  await supabase
    .from("daily_challenges")
    .update({ active: false, status: "completed" })
    .eq("active", true);

  // 2. Fetch challenge target to compute new ends_at (24h from now)
  const now = new Date();
  const endsAt = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

  // 3. Activate target challenge
  const { data, error } = await supabase
    .from("daily_challenges")
    .update({
      active: true,
      status: "active",
      starts_at: now.toISOString(),
      ends_at: endsAt,
    })
    .eq("id", challengeId)
    .select()
    .single();

  if (error) {
    console.error("activateChallengeNow error:", error);
    throw new Error(error.message || "Impossible d'activer ce défi");
  }

  return data;
}

export async function deleteChallenge(challengeId: string | number) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from("daily_challenges")
    .delete()
    .eq("id", challengeId);

  if (error) {
    console.error("deleteChallenge error:", error);
    throw new Error(error.message || "Impossible de supprimer ce défi");
  }
}

export async function createOfficialPost(
  userId?: string | null,
  photoUrl?: string,
  caption?: string,
  isPinned = true,
) {
  if (!isSupabaseConfigured) {
    const localPost: FeedPost = {
      id: Date.now(),
      author: "Game Master VALUO",
      city: "Défi Officiel",
      avatar: "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=300",
      photo: photoUrl || media.redPhone,
      caption: caption || "",
      time: isPinned ? "Épinglé · 08:00" : "À l'instant",
      likes: 0,
      liked: false,
      isPinned,
      isOfficial: true,
      comments: [],
    };
    return localPost;
  }

  let effectiveUserId = userId;
  const isUuid = effectiveUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveUserId);
  if (!isUuid) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      effectiveUserId = user?.id || null;
    } catch {
      effectiveUserId = null;
    }
  }

  // If pinned, unpin existing pinned posts concurrently
  const unpinPromise = isPinned
    ? supabase.from("feed_posts").update({ is_pinned: false }).eq("is_pinned", true)
    : Promise.resolve();

  const insertPromise = supabase
    .from("feed_posts")
    .insert({
      user_id: effectiveUserId,
      photo_url: photoUrl || media.redPhone,
      caption: sanitizeInput(caption || ""),
      city: "Défi Officiel",
      is_pinned: isPinned,
      is_official: true,
    })
    .select()
    .single();

  const [, insertRes] = await Promise.all([unpinPromise, insertPromise]);

  if (insertRes.error) {
    console.error("CRITICAL: Supabase insert into feed_posts failed:", insertRes.error);
    throw new Error(insertRes.error.message || "Impossible de publier l'annonce officielle");
  }

  return insertRes.data;
}

export async function updateFeedPost(
  postId: string | number,
  updates: {
    caption?: string;
    photo_url?: string;
    is_pinned?: boolean;
    is_official?: boolean;
  },
) {
  if (!isSupabaseConfigured) return null;

  if (updates.is_pinned === true) {
    // Unpin other posts first
    await supabase.from("feed_posts").update({ is_pinned: false }).neq("id", postId).eq("is_pinned", true);
  }

  const { data, error } = await supabase
    .from("feed_posts")
    .update(updates)
    .eq("id", postId)
    .select()
    .single();

  if (error) {
    console.error("CRITICAL: Supabase update feed_posts failed:", error);
    throw new Error(error.message || "Impossible de modifier la publication");
  }

  return data;
}

export async function togglePinPost(postId: string | number, isPinned: boolean) {
  return updateFeedPost(postId, { is_pinned: isPinned });
}

export async function deleteFeedPost(postId: string | number) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("feed_posts").delete().eq("id", postId);
  if (error) {
    console.error("CRITICAL: Supabase delete feed_posts failed:", error);
    throw new Error(error.message || "Impossible de supprimer la publication");
  }
}

export async function deleteSquadAdmin(squadId: string, squadCode?: string) {
  if (!isSupabaseConfigured) return;
  try {
    let code = squadCode;
    if (!code) {
      const { data } = await supabase.from("squads").select("code").eq("id", squadId).maybeSingle();
      code = data?.code;
    }

    if (code) {
      removeActiveRecruitmentLocalCache(code);
      await deleteRecruitmentPostBySquadCode(code);
    }

    await supabase.from("squad_members").delete().eq("squad_id", squadId);
    await supabase.from("squads").delete().eq("id", squadId);
  } catch (err) {
    console.warn("Could not delete squad as admin:", err);
  }
}

export type MysteryItemData = {
  id?: string | number;
  title: string;
  image: string;
  brief: string;
  hint: string;
  realPrice: number;
  historyDetails?: string;
  dayNumber?: number;
  starts_at?: string;
  ends_at?: string;
  status?: "draft" | "scheduled" | "active" | "revealed" | "completed" | "archived";
  created_at?: string;
};

export async function fetchMysteryItem(): Promise<MysteryItemData> {
  const defaultStartsAt = new Date();
  defaultStartsAt.setHours(8, 0, 0, 0);
  const defaultEndsAt = new Date();
  defaultEndsAt.setHours(20, 0, 0, 0);

  const defaultMystery: MysteryItemData = {
    title: "Vase en faïence à décor floral",
    image: media.mystery,
    brief: "Hauteur 31 cm. Signature partiellement visible sous la base. Quelques traces du temps, sans éclat majeur.",
    hint: "Une pièce décorative qui a traversé au moins trois générations.",
    realPrice: 68,
    dayNumber: 4,
    starts_at: defaultStartsAt.toISOString(),
    ends_at: defaultEndsAt.toISOString(),
    status: "active",
  };

  if (isSupabaseConfigured) {
    try {
      const now = new Date();
      const nowIso = now.toISOString();

      // 1. Check for active box
      const { data: activeList } = await supabase
        .from("mystery_boxes")
        .select("*")
        .eq("active", true)
        .order("starts_at", { ascending: false })
        .limit(5);

      let chosen = activeList?.find((b) => {
        if (!b.ends_at) return true;
        return true;
      });

      // 2. If no active box, check scheduled box ready to start
      if (!chosen) {
        const { data: scheduled } = await supabase
          .from("mystery_boxes")
          .select("*")
          .eq("status", "scheduled")
          .lte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (scheduled) {
          await supabase
            .from("mystery_boxes")
            .update({ status: "active", active: true })
            .eq("id", scheduled.id);
          chosen = { ...scheduled, status: "active", active: true };
        }
      }

      if (!chosen && activeList && activeList.length > 0) {
        chosen = activeList[0];
      }

      if (chosen) {
        const today20h = new Date();
        today20h.setHours(20, 0, 0, 0);
        const endsAtIso = chosen.ends_at || today20h.toISOString();
        const endsAtTime = new Date(endsAtIso).getTime();
        const isRevealed = Boolean(endsAtTime > 0 && Date.now() >= endsAtTime) || chosen.status === "revealed";

        const item: MysteryItemData = {
          id: chosen.id,
          title: chosen.item_name,
          image: chosen.photo_url,
          brief: chosen.description || "",
          hint: chosen.history_details || "",
          realPrice: Number(chosen.real_price) || 0,
          dayNumber: chosen.day_number || 1,
          starts_at: chosen.starts_at || chosen.created_at,
          ends_at: endsAtIso,
          status: isRevealed ? "revealed" : (chosen.status || "active"),
          created_at: chosen.created_at,
        };

        if (typeof window !== "undefined") {
          localStorage.setItem("valuo_mystery_item", JSON.stringify(item));
        }
        return item;
      }
    } catch {
      // Fall through to local cache
    }
  }

  // Local cache fallback
  const cached = typeof window !== "undefined" ? localStorage.getItem("valuo_mystery_item") : null;
  if (cached) {
    try { return { ...defaultMystery, ...JSON.parse(cached) }; } catch {}
  }

  return defaultMystery;
}

export async function fetchAllMysteryBoxesList(): Promise<MysteryItemData[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("mystery_boxes")
      .select("*")
      .order("starts_at", { ascending: false });

    if (error || !data) return [];

    return data.map((d) => ({
      id: d.id,
      title: d.item_name,
      image: d.photo_url,
      brief: d.description || "",
      hint: d.history_details || "",
      realPrice: Number(d.real_price) || 0,
      dayNumber: d.day_number || 1,
      starts_at: d.starts_at || d.created_at,
      ends_at: d.ends_at || undefined,
      status: d.status || (d.active ? "active" : "revealed"),
      created_at: d.created_at,
    }));
  } catch (err) {
    console.warn("fetchAllMysteryBoxesList error:", err);
    return [];
  }
}

export async function saveMysteryItem(
  item: Partial<MysteryItemData>,
  options?: {
    isScheduled?: boolean;
    startsAt?: string;
    endsAt?: string;
    dayNumber?: number;
  }
) {
  if (isSupabaseConfigured) {
    try {
      const isScheduled = options?.isScheduled ?? (item.status === "scheduled");
      
      // Default: today or chosen date from 08h00 to 20h00
      let startsAt = options?.startsAt || item.starts_at;
      let endsAt = options?.endsAt || item.ends_at;

      if (!startsAt || !endsAt) {
        const today = new Date();
        const start = new Date(today);
        start.setHours(8, 0, 0, 0);
        const end = new Date(today);
        end.setHours(20, 0, 0, 0);

        if (!startsAt) startsAt = start.toISOString();
        if (!endsAt) endsAt = end.toISOString();
      }

      const todayStr = new Date(startsAt).toISOString().split("T")[0];
      const dayNumber = options?.dayNumber || item.dayNumber || 1;
      const boxStatus = isScheduled ? "scheduled" : "active";

      // If active now, unmark others as active
      if (!isScheduled) {
        await supabase
          .from("mystery_boxes")
          .update({ active: false, status: "completed" })
          .eq("active", true);
      }

      if (item.id) {
        // UPDATE
        const { data, error: updateErr } = await supabase
          .from("mystery_boxes")
          .update({
            item_name: item.title,
            photo_url: item.image,
            description: item.brief,
            history_details: item.hint,
            real_price: item.realPrice,
            day_number: dayNumber,
            date: todayStr,
            active: !isScheduled,
            status: boxStatus,
            starts_at: startsAt,
            ends_at: endsAt,
          })
          .eq("id", item.id)
          .select()
          .single();

        if (updateErr) {
          console.error("saveMysteryItem update error:", updateErr);
          throw new Error(updateErr.message);
        }
        return data;
      } else {
        // INSERT
        const { data, error: insertErr } = await supabase
          .from("mystery_boxes")
          .insert({
            item_name: item.title || "Objet Mystère",
            photo_url: item.image || media.mystery,
            description: item.brief || "",
            history_details: item.hint || "",
            real_price: item.realPrice || 50,
            day_number: dayNumber,
            date: todayStr,
            active: !isScheduled,
            status: boxStatus,
            starts_at: startsAt,
            ends_at: endsAt,
          })
          .select()
          .single();

        if (insertErr) {
          console.error("saveMysteryItem insert error:", insertErr);
          throw new Error(insertErr.message);
        }
        return data;
      }
    } catch (err: any) {
      console.warn("saveMysteryItem failed:", err);
      throw err;
    }
  }
}

export async function activateMysteryBoxNow(boxId: string | number) {
  if (!isSupabaseConfigured) return;

  // Mark other boxes as completed
  await supabase
    .from("mystery_boxes")
    .update({ active: false, status: "completed" })
    .eq("active", true);

  const now = new Date();
  const end = new Date(now);
  end.setHours(20, 0, 0, 0);
  if (end.getTime() <= now.getTime()) {
    end.setTime(now.getTime() + 4 * 3600 * 1000);
  }

  const { data, error } = await supabase
    .from("mystery_boxes")
    .update({
      active: true,
      status: "active",
      starts_at: now.toISOString(),
      ends_at: end.toISOString(),
    })
    .eq("id", boxId)
    .select()
    .single();

  if (error) {
    console.error("activateMysteryBoxNow error:", error);
    throw new Error(error.message || "Impossible d'activer cet objet");
  }

  return data;
}

export async function revealMysteryBoxNow(boxId: string | number) {
  if (!isSupabaseConfigured) return;

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("mystery_boxes")
    .update({
      status: "revealed",
      ends_at: nowIso,
    })
    .eq("id", boxId)
    .select()
    .single();

  if (error) {
    console.error("revealMysteryBoxNow error:", error);
    throw new Error(error.message || "Impossible de révéler cet objet");
  }

  // Calculate points
  try {
    await supabase.rpc("calculate_mystery_box_points", { p_box_id: boxId });
  } catch (rpcErr) {
    console.warn("RPC calculate_mystery_box_points fallback:", rpcErr);
  }

  return data;
}

export async function deleteMysteryBox(boxId: string | number) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from("mystery_boxes")
    .delete()
    .eq("id", boxId);

  if (error) {
    console.error("deleteMysteryBox error:", error);
    throw new Error(error.message || "Impossible de supprimer cet objet");
  }
}

// ============================================================================
// RECRUITMENT POST HELPERS & LOCAL CACHE
// ============================================================================

export function createRecruitmentFeedPostObj(
  squadCode: string,
  squadName: string,
  customId?: number | string,
): FeedPost {
  return {
    id: customId || `recruit-${squadCode}`,
    author: "VALUO Matchmaking",
    city: "Arène VALUO",
    avatar: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=300",
    photo: "",
    caption: `Recherche 3 coéquipiers pour relever les défis de la semaine dans « ${squadName} » ! Rejoins-nous en 1 clic.`,
    time: "À l'instant",
    likes: 0,
    comments: [],
    isPinned: false,
    isOfficial: false,
    isRecruitment: true,
    squadCode,
    squadName,
  };
}

export function saveActiveRecruitmentLocalCache(squadCode: string, squadName: string) {
  if (typeof window === "undefined" || !squadCode) return;
  try {
    const listRaw = localStorage.getItem("valuo_active_recruitment_codes");
    const list: Record<string, string> = listRaw ? JSON.parse(listRaw) : {};
    list[squadCode] = squadName;
    localStorage.setItem("valuo_active_recruitment_codes", JSON.stringify(list));
  } catch {}
}

export function removeActiveRecruitmentLocalCache(squadCode: string) {
  if (typeof window === "undefined" || !squadCode) return;
  try {
    const listRaw = localStorage.getItem("valuo_active_recruitment_codes");
    if (!listRaw) return;
    const list: Record<string, string> = JSON.parse(listRaw);
    delete list[squadCode];
    localStorage.setItem("valuo_active_recruitment_codes", JSON.stringify(list));
  } catch {}
}

export function getActiveRecruitmentLocalCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const listRaw = localStorage.getItem("valuo_active_recruitment_codes");
    return listRaw ? JSON.parse(listRaw) : {};
  } catch {
    return {};
  }
}

export async function fetchFeedPosts(currentUserId?: string): Promise<FeedPost[]> {
  let posts: FeedPost[] = [];

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("feed_posts")
      .select(`
        id,
        photo_url,
        caption,
        city,
        is_pinned,
        is_official,
        likes_count,
        created_at,
        profiles:profiles!feed_posts_user_id_fkey (
          id,
          name,
          avatar_url
        ),
        post_likes (
          user_id
        ),
        post_comments (
          id,
          text,
          created_at,
          profiles:profiles!post_comments_user_id_fkey (
            name,
            avatar_url
          )
        )
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchFeedPosts DB error:", error);
    }

    if (!error && data && data.length > 0) {
      posts = data.map((item: any) => {
        const userLiked = currentUserId
          ? item.post_likes?.some((like: any) => like.user_id === currentUserId)
          : false;

        const formattedComments = (item.post_comments || []).map((c: any) => ({
          id: c.id,
          author: c.profiles?.name || "Membre",
          avatar: c.profiles?.avatar_url || avatars.lea,
          text: c.text,
        }));

        // Format relative time
        const diffMin = Math.max(1, Math.round((Date.now() - new Date(item.created_at).getTime()) / 60000));
        const timeStr = diffMin < 60 ? `Il y a ${diffMin} min` : `Il y a ${Math.round(diffMin / 60)} h`;

        const recruitmentMatch = item.caption ? item.caption.match(/^\[RECRUITMENT\|([^|]+)\|([^\]]+)\]\s*(.*)$/s) : null;
        const cleanCaption = recruitmentMatch ? recruitmentMatch[3] : item.caption;
        const isRecruit = !!recruitmentMatch;

        return {
          id: item.id,
          author: isRecruit
            ? "VALUO Matchmaking"
            : item.is_official
            ? (item.profiles?.name || "Game Master VALUO")
            : (item.profiles?.name || "Joueur VALUO"),
          city: isRecruit ? "Arène VALUO" : item.is_official ? "Défi Officiel" : (item.city || "France"),
          avatar: isRecruit
            ? "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=300"
            : (item.profiles?.avatar_url || avatars.lea),
          photo: isRecruit ? "" : item.photo_url,
          caption: cleanCaption,
          time: item.is_pinned ? "Épinglé · 08:00" : timeStr,
          likes: item.likes_count || 0,
          liked: userLiked,
          isPinned: isRecruit ? false : item.is_pinned,
          isOfficial: isRecruit ? false : item.is_official,
          isRecruitment: isRecruit,
          squadCode: recruitmentMatch ? recruitmentMatch[1] : undefined,
          squadName: recruitmentMatch ? recruitmentMatch[2] : undefined,
          comments: formattedComments,
        };
      });
    }
  }

  // Clean up and filter out any recruitment posts whose squad no longer exists in DB
  if (isSupabaseConfigured && posts.some((p) => p.isRecruitment && p.squadCode)) {
    try {
      const { data: activeSquads } = await supabase.from("squads").select("code");
      const activeCodes = new Set((activeSquads || []).map((s: any) => s.code));

      const stalePosts = posts.filter((p) => p.isRecruitment && p.squadCode && !activeCodes.has(p.squadCode));
      if (stalePosts.length > 0) {
        for (const sp of stalePosts) {
          supabase.from("feed_posts").delete().eq("id", sp.id).then();
        }
        posts = posts.filter((p) => !(p.isRecruitment && p.squadCode && !activeCodes.has(p.squadCode)));
      }
    } catch (e) {
      console.warn("Could not prune stale recruitment posts:", e);
    }
  }

  // Clean up any stale recruitment cache keys in localStorage that no longer exist in live Supabase DB
  if (isSupabaseConfigured && typeof window !== "undefined") {
    try {
      const activeDbCodes = new Set(posts.filter((p) => p.isRecruitment && p.squadCode).map((p) => p.squadCode!));
      const cached = getActiveRecruitmentLocalCache();
      let changed = false;
      for (const c of Object.keys(cached)) {
        if (!activeDbCodes.has(c)) {
          delete cached[c];
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem("valuo_active_recruitment_codes", JSON.stringify(cached));
      }
    } catch {}
  }

  // Rehydrate local recruitment cache ONLY when Supabase is NOT configured (demo / offline mode)
  if (!isSupabaseConfigured) {
    const cachedRecruitments = getActiveRecruitmentLocalCache();
    const recruitmentSquadCodes = Object.keys(cachedRecruitments);

    if (recruitmentSquadCodes.length > 0) {
      for (const code of recruitmentSquadCodes) {
        const alreadyInList = posts.some((p) => p.squadCode === code);
        if (!alreadyInList) {
          const squadName = cachedRecruitments[code];
          const recruitPost = createRecruitmentFeedPostObj(code, squadName);
          const pinned = posts.filter((p) => p.isPinned);
          const unpinned = posts.filter((p) => !p.isPinned);
          posts = [...pinned, recruitPost, ...unpinned];
        }
      }
    }
  }

  // Always strictly guarantee pinned post is index 0
  const finalPinned = posts.filter((p) => p.isPinned);
  const finalUnpinned = posts.filter((p) => !p.isPinned);
  return [...finalPinned, ...finalUnpinned];
}

export async function createFeedPost(
  userId: string,
  photoUrl: string,
  caption: string,
  city?: string,
  challengeId?: string,
  squadRecruitment?: { code: string; name: string },
) {
  if (!isSupabaseConfigured) return null;

  const rawCaption = squadRecruitment
    ? `[RECRUITMENT|${squadRecruitment.code}|${squadRecruitment.name}] ${caption}`
    : caption;

  const { data, error } = await supabase
    .from("feed_posts")
    .insert({
      user_id: userId,
      photo_url: photoUrl,
      caption: sanitizeInput(rawCaption),
      city: sanitizeInput(city || "France"),
      challenge_id: challengeId || null,
      is_pinned: false,
      is_official: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating post:", error);
    return null;
  }
  return data;
}

export async function togglePostLike(userId: string, postId: string | number, currentlyLiked: boolean) {
  if (!isSupabaseConfigured) return;

  if (currentlyLiked) {
    await supabase.from("post_likes").delete().match({ user_id: userId, post_id: postId });
  } else {
    await supabase.from("post_likes").insert({ user_id: userId, post_id: postId });
  }
}

export async function addPostComment(userId: string, postId: string | number, text: string) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      user_id: userId,
      post_id: postId,
      text: sanitizeInput(text),
    })
    .select()
    .single();

  if (error) console.error("Error adding comment:", error);
  return data;
}

// ============================================================================
// 3. STORAGE UPLOAD (POSTS & AVATARS)
// ============================================================================

export async function uploadImage(file: File, bucket: "posts" | "avatars" = "posts"): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

// ============================================================================
// 4. SQUADS & SQUAD MEMBERS
// ============================================================================

export async function fetchUserSquad(userId: string): Promise<GroupData | null> {
  if (!isSupabaseConfigured) return null;

  const { data: memberEntry } = await supabase
    .from("squad_members")
    .select("squad_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!memberEntry?.squad_id) return null;

  const { data: squad } = await supabase
    .from("squads")
    .select(`
      id,
      name,
      code,
      week_number,
      created_by,
      pending_leader_id,
      squad_members (
        id,
        user_id,
        npc_name,
        npc_avatar,
        is_npc,
        points,
        rank_change,
        current_estimate,
        joined_at,
        profiles (
          id,
          name,
          avatar_url
        )
      )
    `)
    .eq("id", memberEntry.squad_id)
    .single();

  if (!squad) return null;

  const rawMembers = squad.squad_members || [];
  const userIds = rawMembers.filter((m: any) => !m.is_npc && m.user_id).map((m: any) => m.user_id);

  let profilesMap: Record<string, any> = {};
  if (userIds.length > 0) {
    try {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);
      if (profs) {
        profs.forEach((p) => {
          profilesMap[p.id] = p;
        });
      }
    } catch (profErr) {
      console.warn("Could not fetch extra profile details:", profErr);
    }
  }

  const members: GroupMember[] = rawMembers.map((m: any, idx: number) => {
    const prof = m.profiles || profilesMap[m.user_id];
    return {
      id: idx + 1,
      userId: m.user_id || undefined,
      name: m.is_npc ? m.npc_name : (prof?.name?.split(" ")[0] || "Membre"),
      avatar: m.is_npc ? m.npc_avatar : (prof?.avatar_url || avatars.lea),
      points: m.points || 0,
      change: m.rank_change || 0,
      estimate: m.current_estimate ? Number(m.current_estimate) : null,
      isNpc: m.is_npc,
    };
  });

  return {
    id: squad.id,
    name: squad.name,
    code: squad.code,
    week: squad.week_number || 38,
    members,
    createdBy: squad.created_by,
    pendingLeaderId: squad.pending_leader_id,
    isLeader: Boolean(squad.created_by && squad.created_by === userId),
  };
}

export async function deleteRecruitmentPostBySquadCode(squadCode: string): Promise<boolean> {
  removeActiveRecruitmentLocalCache(squadCode);
  if (!isSupabaseConfigured || !squadCode) return false;
  try {
    const pattern = `%${squadCode}%`;
    await supabase.from("feed_posts").delete().ilike("caption", pattern);
    return true;
  } catch (err) {
    console.warn("deleteRecruitmentPost error:", err);
    return false;
  }
}

export async function republishSquadRecruitment(
  userId: string,
  squadCode: string,
  squadName: string,
  city?: string,
) {
  saveActiveRecruitmentLocalCache(squadCode, squadName);
  if (!isSupabaseConfigured) return null;

  // 1. Clean previous post for this squad code
  await deleteRecruitmentPostBySquadCode(squadCode);
  saveActiveRecruitmentLocalCache(squadCode, squadName);

  // 2. Create fresh post (banner only, no dummy photo)
  return await createFeedPost(
    userId,
    "",
    "Recherche 3 coéquipiers pour relever les défis de la semaine dans mon escouade ! Rejoins-nous en 1 clic.",
    city || "France",
    undefined,
    { code: squadCode, name: squadName },
  );
}

export async function leaveSquadInDb(
  userId: string,
  squadId?: string,
  squadCode?: string,
): Promise<{ remainingCount: number; pendingLeaderId?: string }> {
  if (!isSupabaseConfigured) return { remainingCount: 0 };

  try {
    // 1. Invoke atomic succession RPC
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("leave_squad_with_succession", {
      p_user_id: userId,
      p_squad_id: squadId || null,
      p_squad_code: squadCode || null,
    });

    if (!rpcErr && rpcRes) {
      return {
        remainingCount: rpcRes.remaining_count ?? 0,
        pendingLeaderId: rpcRes.pending_leader_id,
      };
    }

    // Direct fallback
    let targetSquadId = squadId;
    let targetSquadCode = squadCode;

    if (!targetSquadId || !targetSquadCode) {
      const { data: mem } = await supabase
        .from("squad_members")
        .select("squad_id, squads:squad_id(id, code)")
        .eq("user_id", userId)
        .maybeSingle();

      if (mem?.squads) {
        targetSquadId = (mem.squads as any).id;
        targetSquadCode = (mem.squads as any).code;
      }
    }

    await supabase.from("squad_members").delete().eq("user_id", userId);

    if (targetSquadId) {
      const { data: remainingMembers } = await supabase
        .from("squad_members")
        .select("id, user_id, is_npc")
        .eq("squad_id", targetSquadId)
        .eq("is_npc", false);

      const remainingCount = remainingMembers?.length || 0;

      if (remainingCount === 0) {
        await supabase.from("squads").delete().eq("id", targetSquadId);
        if (targetSquadCode) {
          await deleteRecruitmentPostBySquadCode(targetSquadCode);
        }
      } else {
        const nextLeaderId = remainingMembers?.[0]?.user_id;
        if (nextLeaderId) {
          await supabase.from("squads").update({ created_by: nextLeaderId }).eq("id", targetSquadId);
        }
      }

      return { remainingCount };
    }

    return { remainingCount: 0 };
  } catch (err) {
    console.warn("leaveSquadInDb error:", err);
    return { remainingCount: 0 };
  }
}

export async function acceptSquadLeadership(squadId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !squadId) return false;
  try {
    const { data, error } = await supabase.rpc("accept_squad_leadership", {
      p_squad_id: squadId,
    });
    return Boolean(!error && data?.success);
  } catch (err) {
    console.warn("acceptSquadLeadership error:", err);
    return false;
  }
}

export async function refuseSquadLeadership(squadId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !squadId) return false;
  try {
    const { data, error } = await supabase.rpc("refuse_squad_leadership", {
      p_squad_id: squadId,
    });
    return Boolean(!error && data?.success);
  } catch (err) {
    console.warn("refuseSquadLeadership error:", err);
    return false;
  }
}

export async function createSquadInDb(
  userId: string,
  squadName: string,
  invitedFriends: string[] = [],
  fillWithNpc = false,
): Promise<GroupData | null> {
  if (!isSupabaseConfigured) return null;

  // Clean up any existing squad membership first to avoid 409 conflicts
  await leaveSquadInDb(userId);

  const code = `VALUO-${Math.floor(100 + Math.random() * 900)}`;

  const { data: squad, error } = await supabase
    .from("squads")
    .insert({
      name: sanitizeInput(squadName),
      code,
      created_by: userId,
      week_number: 38,
      status: "active",
    })
    .select()
    .single();

  if (error || !squad) {
    console.error("Error creating squad:", error);
    return null;
  }

  const membersToInsert: Array<{
    squad_id: string;
    user_id?: string | null;
    npc_name?: string;
    npc_avatar?: string;
    points: number;
    rank_change: number;
    is_npc: boolean;
    current_estimate?: number;
  }> = [
    {
      squad_id: squad.id,
      user_id: userId,
      points: 0,
      rank_change: 0,
      is_npc: false,
    },
  ];

  // If friends are selected, add them
  if (invitedFriends && invitedFriends.length > 0) {
    try {
      const { data: friendProfiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("name", invitedFriends);

      if (friendProfiles && friendProfiles.length > 0) {
        for (const fp of friendProfiles) {
          membersToInsert.push({
            squad_id: squad.id,
            user_id: fp.id,
            points: 0,
            rank_change: 0,
            is_npc: false,
          });
        }
      }
    } catch (e) {
      console.warn("Could not attach invited friends:", e);
    }
  }

  // Only fill with NPC rivals if explicitly requested (e.g. matchmaking mode)
  if (fillWithNpc) {
    const npcs = [
      { name: "Léon (IA)", avatar: avatars.samir, est: 55 },
      { name: "Camille (IA)", avatar: avatars.camille, est: 63 },
      { name: "Jeanne (IA)", avatar: avatars.ines, est: 71 },
    ];

    const slotsNeeded = Math.max(0, 4 - membersToInsert.length);
    for (let i = 0; i < slotsNeeded; i++) {
      membersToInsert.push({
        squad_id: squad.id,
        npc_name: npcs[i]?.name || `Rival ${i + 1} (IA)`,
        npc_avatar: npcs[i]?.avatar || avatars.samir,
        is_npc: true,
        points: 0,
        rank_change: 0,
        current_estimate: npcs[i]?.est || 55 + i * 8,
      });
    }
  }

  const { error: membersError } = await supabase.from("squad_members").insert(membersToInsert);
  if (membersError) {
    console.error("Error inserting squad members:", membersError);
  }

  return await fetchUserSquad(userId);
}

export async function joinSquadByCode(userId: string, code: string): Promise<GroupData | null> {
  if (!isSupabaseConfigured) return null;

  const cleanCode = code.trim().toUpperCase();

  // 1. Try atomic security definer RPC
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("join_squad_by_code", {
      p_code: cleanCode,
    });

    if (!rpcErr && rpcRes?.success) {
      return await fetchUserSquad(userId);
    }
  } catch (rpcEx) {
    console.warn("join_squad_by_code RPC attempt error:", rpcEx);
  }

  // 2. Direct fallback
  const { data: squad } = await supabase
    .from("squads")
    .select("id")
    .eq("code", cleanCode)
    .maybeSingle();

  if (!squad) return null;

  // Clean up any previous squad membership before joining new one
  await leaveSquadInDb(userId);

  await supabase.from("squad_members").upsert({
    squad_id: squad.id,
    user_id: userId,
    points: 0,
    rank_change: 0,
    is_npc: false,
  });

  return await fetchUserSquad(userId);
}

// ============================================================================
// 5. FRIENDSHIPS
// ============================================================================

export async function fetchUserFriends(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];

  const { data } = await supabase
    .from("friendships")
    .select(`
      friend_id,
      profiles:friend_id (
        name
      )
    `)
    .eq("user_id", userId);

  if (!data) return [];

  return data.map((f: any) => f.profiles?.name).filter(Boolean);
}

export async function toggleFriendshipInDb(userId: string, friendId: string, isFriend: boolean) {
  if (!isSupabaseConfigured) return;

  if (isFriend) {
    await supabase.from("friendships").delete().match({ user_id: userId, friend_id: friendId });
  } else {
    await supabase.from("friendships").insert({ user_id: userId, friend_id: friendId });
  }
}

// ============================================================================
// 6. NOTIFICATIONS
// ============================================================================

export async function fetchUserNotifications(userId: string): Promise<AppNotification[]> {
  if (!isSupabaseConfigured) return [];

  const { data } = await supabase
    .from("notifications")
    .select(`
      id,
      type,
      title,
      message,
      target_tab,
      target_post_id,
      read,
      created_at,
      profiles:actor_id (
        avatar_url
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  return data.map((n: any) => {
    const diffMin = Math.max(1, Math.round((Date.now() - new Date(n.created_at).getTime()) / 60000));
    const timeStr = diffMin < 60 ? `Il y a ${diffMin} min` : `Il y a ${Math.round(diffMin / 60)} h`;

    return {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      time: timeStr,
      read: n.read,
      targetTab: n.target_tab || "feed",
      targetPostId: n.target_post_id,
      avatar: n.profiles?.avatar_url,
    };
  });
}

export async function markNotificationsAsReadInDb(userId: string) {
  if (!isSupabaseConfigured) return;
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId);
}
