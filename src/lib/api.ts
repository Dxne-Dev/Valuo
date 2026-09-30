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

  // Send custom VALUO welcome email
  await sendValuoWelcomeEmail({
    email: cleanEmail,
    name: userName,
    tempPassword,
    activationUrl,
  });

  if (!isSupabaseConfigured) {
    return { data: null, error: null, tempPassword, isMock: true };
  }

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

  return { data, error, tempPassword, isMock: false };
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
  const cached = typeof window !== "undefined" ? localStorage.getItem(`valuo_user_profile_${userId}`) : null;
  let localProfile: UserProfile | null = null;
  if (cached) {
    try {
      localProfile = JSON.parse(cached);
    } catch {}
  }

  if (!isSupabaseConfigured) return localProfile;

  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const { data: authData } = await supabase.auth.getUser();
    const meta = authData?.user?.user_metadata;

    const isAdmin = Boolean(
      data?.is_admin === true ||
      meta?.is_admin === true ||
      localProfile?.isAdmin === true
    );

    // Prioritize explicit onboarding choices from localProfile or auth metadata over default trigger values
    const effectiveName = (localProfile?.name && localProfile.name !== "Chasseur VALUO" && localProfile.name !== "Joueur VALUO" ? localProfile.name : (meta?.name || data?.name)) || "Joueur VALUO";
    const effectiveCity = (localProfile?.city && localProfile.city !== "France" ? localProfile.city : (meta?.city || data?.city)) || "France";
    const effectiveAvatar = (localProfile?.avatar ? localProfile.avatar : (meta?.avatar_url || data?.avatar_url)) || avatars.lea;

    const fetchedProfile: UserProfile = {
      name: effectiveName,
      city: effectiveCity,
      bio: data?.bio || localProfile?.bio || "",
      avatar: effectiveAvatar,
      cover: data?.cover_url || localProfile?.cover || "https://images.pexels.com/photos/8099796/pexels-photo-8099796.jpeg",
      memberSince: data?.member_since || localProfile?.memberSince || "Septembre 2026",
      isAdmin,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(`valuo_user_profile_${userId}`, JSON.stringify(fetchedProfile));
    }

    return fetchedProfile;
  } catch (e) {
    console.warn("fetchUserProfile error:", e);
    return localProfile;
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
  remaining: string;
};

export async function deactivateActiveChallenge() {
  // Always clear local caches so the current browser reflects the change immediately
  if (typeof window !== "undefined") {
    localStorage.removeItem("valuo_custom_challenge");
    localStorage.removeItem("valuo_challenge_cache_ts");
  }
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from("daily_challenges")
      .update({ active: false })
      .eq("active", true);
  } catch (err) {
    console.warn("Could not deactivate challenge:", err);
  }
}

export async function fetchActiveChallenge(): Promise<ChallengeData | null> {
  // Supabase is the source of truth. localStorage is only a short-lived cache (30s).
  const CACHE_TTL_MS = 30_000;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("daily_challenges")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const challenge: ChallengeData = {
          id: data.id,
          theme: data.theme,
          date: new Date(data.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
          brief: data.brief,
          remaining: data.remaining || "6 h 24",
        };
        // Update local cache
        if (typeof window !== "undefined") {
          localStorage.setItem("valuo_custom_challenge", JSON.stringify(challenge));
          localStorage.setItem("valuo_challenge_cache_ts", String(Date.now()));
          localStorage.removeItem("valuo_challenge_deactivated");
        }
        return challenge;
      }

      // Supabase returned no active challenge — treat as deactivated
      if (!error && !data) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("valuo_custom_challenge");
          localStorage.removeItem("valuo_challenge_cache_ts");
        }
        return null;
      }
    } catch {
      // Network error: fall through to cache
    }
  }

  // Fallback: read local cache if fresh enough
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("valuo_custom_challenge");
    const ts = Number(localStorage.getItem("valuo_challenge_cache_ts") || "0");
    if (cached && Date.now() - ts < CACHE_TTL_MS) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.theme) return parsed as ChallengeData;
      } catch {}
    }
  }

  return null;
}

export async function saveActiveChallenge(challenge: Partial<ChallengeData>) {
  // Write to Supabase first (source of truth), then update local cache
  if (isSupabaseConfigured) {
    try {
      await supabase.from("daily_challenges").update({ active: false }).eq("active", true);
      await supabase.from("daily_challenges").insert({
        theme: challenge.theme,
        brief: challenge.brief,
        date: new Date().toISOString(),
        active: true,
        remaining: challenge.remaining || "6 h 24",
      });
    } catch (err) {
      console.warn("Could not save challenge to Supabase:", err);
    }
  }

  // Always update local cache so the admin browser reflects it immediately
  if (typeof window !== "undefined") {
    localStorage.removeItem("valuo_challenge_deactivated");
    const merged = { ...challenge, date: challenge.date || new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) };
    localStorage.setItem("valuo_custom_challenge", JSON.stringify(merged));
    localStorage.setItem("valuo_challenge_cache_ts", String(Date.now()));
  }
}

export async function createOfficialPost(
  userId?: string | null,
  photoUrl?: string,
  caption?: string,
  isPinned = true,
) {
  if (!isSupabaseConfigured) return null;

  try {
    let effectiveUserId = userId;
    const isUuid = effectiveUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveUserId);
    if (!isUuid) {
      const { data: { user } } = await supabase.auth.getUser();
      effectiveUserId = user?.id || null;
    }

    if (isPinned) {
      // Unpin any previously pinned posts so only the latest is pinned
      await supabase.from("feed_posts").update({ is_pinned: false }).eq("is_pinned", true);
    }

    const { data, error } = await supabase
      .from("feed_posts")
      .insert({
        user_id: effectiveUserId,
        photo_url: photoUrl || "",
        caption: caption || "",
        city: "Défi Officiel",
        is_pinned: isPinned,
        is_official: true,
      })
      .select()
      .single();

    if (error) {
      console.warn("Could not create official post in DB:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("Official post error:", err);
    return null;
  }
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

  try {
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
      console.warn("Could not update feed post:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("Update feed post error:", err);
    return null;
  }
}

export async function togglePinPost(postId: string | number, isPinned: boolean) {
  return updateFeedPost(postId, { is_pinned: isPinned });
}

export async function deleteFeedPost(postId: string | number) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from("feed_posts").delete().eq("id", postId);
  } catch (err) {
    console.warn("Could not delete post:", err);
  }
}

export async function deleteSquadAdmin(squadId: string) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from("squad_members").delete().eq("squad_id", squadId);
    await supabase.from("squads").delete().eq("id", squadId);
  } catch (err) {
    console.warn("Could not delete squad as admin:", err);
  }
}

export type MysteryItemData = {
  title: string;
  image: string;
  brief: string;
  hint: string;
  realPrice: number;
};

export async function fetchMysteryItem(): Promise<MysteryItemData> {
  const defaultMystery: MysteryItemData = {
    title: "Vase en faïence à décor floral",
    image: media.mystery,
    brief: "Hauteur 31 cm. Signature partiellement visible sous la base. Quelques traces du temps, sans éclat majeur.",
    hint: "Une pièce décorative qui a traversé au moins trois générations.",
    realPrice: 68,
  };

  // mystery_boxes is the single source of truth (6 items/week, active = today's item)
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("mystery_boxes")
        .select("*")
        .eq("active", true)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const item: MysteryItemData = {
          title: data.item_name,
          image: data.photo_url,
          brief: data.description || "",
          hint: data.history_details || "",
          realPrice: Number(data.real_price) || 0,
        };
        if (typeof window !== "undefined") {
          localStorage.setItem("valuo_mystery_item", JSON.stringify(item));
        }
        return item;
      }
    } catch {
      // Network error: fall through to local cache
    }
  }

  // Local cache fallback
  const cached = typeof window !== "undefined" ? localStorage.getItem("valuo_mystery_item") : null;
  if (cached) {
    try { return { ...defaultMystery, ...JSON.parse(cached) }; } catch {}
  }

  return defaultMystery;
}

export async function saveMysteryItem(item: Partial<MysteryItemData>) {
  // mystery_boxes is the single source of truth — update today's active item
  if (isSupabaseConfigured) {
    try {
      // Try to update the existing active item for today first
      const { data: existing } = await supabase
        .from("mystery_boxes")
        .select("id")
        .eq("active", true)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from("mystery_boxes").update({
          item_name: item.title,
          photo_url: item.image,
          description: item.brief || "",
          history_details: item.hint || "",
          real_price: item.realPrice || 0,
        }).eq("id", existing.id);
      } else {
        // No active item yet — insert one for today
        // day_number constraint: 1=Mon ... 6=Sat, cap Sunday at 6
        const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon ... 6=Sat
        const dayNumber = dayOfWeek === 0 ? 6 : Math.min(dayOfWeek, 6);
        await supabase.from("mystery_boxes").insert({
          item_name: item.title,
          photo_url: item.image,
          description: item.brief || "",
          history_details: item.hint || "",
          real_price: item.realPrice || 0,
          date: new Date().toISOString().split("T")[0],
          day_number: dayNumber,
          active: true,
        });
      }
    } catch (err) {
      console.warn("Could not save mystery item to Supabase:", err);
    }
  }

  // Always update local cache so the admin browser sees it instantly
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("valuo_mystery_item");
    let merged: Partial<MysteryItemData> = { ...item };
    if (cached) {
      try { merged = { ...JSON.parse(cached), ...item }; } catch {}
    }
    localStorage.setItem("valuo_mystery_item", JSON.stringify(merged));
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
        profiles (
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
          profiles (
            name,
            avatar_url
          )
        )
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

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

  // Rehydrate local recruitment cache (for demo or offline / fast display)
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
      squad_members (
        id,
        user_id,
        npc_name,
        npc_avatar,
        is_npc,
        points,
        rank_change,
        current_estimate,
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

  const members: GroupMember[] = (squad.squad_members || []).map((m: any, idx: number) => ({
    id: idx + 1,
    name: m.is_npc ? m.npc_name : (m.profiles?.name?.split(" ")[0] || "Membre"),
    avatar: m.is_npc ? m.npc_avatar : (m.profiles?.avatar_url || avatars.lea),
    points: m.points || 0,
    change: m.rank_change || 0,
    estimate: m.current_estimate ? Number(m.current_estimate) : null,
    isNpc: m.is_npc,
  }));

  return {
    id: squad.id,
    name: squad.name,
    code: squad.code,
    week: squad.week_number || 38,
    members,
  };
}

export async function deleteRecruitmentPostBySquadCode(squadCode: string): Promise<boolean> {
  removeActiveRecruitmentLocalCache(squadCode);
  if (!isSupabaseConfigured || !squadCode) return false;
  try {
    const pattern = `[RECRUITMENT|${squadCode}|%`;
    await supabase.from("feed_posts").delete().like("caption", pattern);
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
): Promise<{ remainingCount: number }> {
  if (!isSupabaseConfigured) return { remainingCount: 0 };

  try {
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

    // 1. Remove user from squad_members
    await supabase
      .from("squad_members")
      .delete()
      .eq("user_id", userId);

    // 2. Check remaining real members in that squad
    if (targetSquadId) {
      const { data: remainingMembers } = await supabase
        .from("squad_members")
        .select("id, user_id, is_npc")
        .eq("squad_id", targetSquadId)
        .eq("is_npc", false);

      const remainingCount = remainingMembers?.length || 0;

      if (remainingCount === 0) {
        // Delete orphaned squad
        await supabase
          .from("squads")
          .delete()
          .eq("id", targetSquadId);

        // Delete associated recruitment post from feed
        if (targetSquadCode) {
          await deleteRecruitmentPostBySquadCode(targetSquadCode);
        }
      } else {
        // If creator left, promote first remaining member to created_by
        const nextLeaderId = remainingMembers?.[0]?.user_id;
        if (nextLeaderId) {
          await supabase
            .from("squads")
            .update({ created_by: nextLeaderId })
            .eq("id", targetSquadId);
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

  const { data: squad } = await supabase
    .from("squads")
    .select("id")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  if (!squad) return null;

  // Clean up any previous squad membership before joining new one
  await leaveSquadInDb(userId);

  await supabase.from("squad_members").upsert({
    squad_id: squad.id,
    user_id: userId,
    points: 140,
    rank_change: 10,
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
