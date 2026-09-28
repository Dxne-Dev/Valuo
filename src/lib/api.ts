import { supabase, isSupabaseConfigured } from "./supabase";
export { isSupabaseConfigured };
import {
  type AppNotification,
  avatars,
  type FeedPost,
  type GroupData,
  type GroupMember,
  media,
  pinnedGameMasterPost,
  todayChallenge,
  type UserProfile,
} from "../data";

// ============================================================================
// 1. AUTHENTICATION & PROFILE
// ============================================================================

// Generate a random temporary password (e.g. "Valuo-4927")
export function generateTemporaryPassword() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Valuo-${num}!`;
}

export async function getCurrentSession() {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

import { sendValuoWelcomeEmail } from "./emailService";

export async function registerWithTemporaryPassword(email: string, name?: string) {
  const tempPassword = generateTemporaryPassword();
  const userName = name?.trim() || splitEmail(email);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const activationUrl = `${origin}?mode=login&email=${encodeURIComponent(email.trim())}`;

  // Send custom VALUO welcome email
  await sendValuoWelcomeEmail({
    email: email.trim(),
    name: userName,
    tempPassword,
    activationUrl,
  });

  if (!isSupabaseConfigured) {
    return { data: null, error: null, tempPassword, isMock: true };
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
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
  if (!isSupabaseConfigured) {
    return { data: null, error: null, isMock: true };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim(),
  });

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
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return localProfile;
    }

    const isAdmin = Boolean(
      data.is_admin === true ||
      localProfile?.isAdmin === true
    );

    // Merge: prefer DB fields, fallback to localProfile fields
    const fetchedProfile: UserProfile = {
      name: data.name || localProfile?.name || "Joueur VALUO",
      city: data.city || localProfile?.city || "France",
      bio: data.bio || localProfile?.bio || "",
      avatar: data.avatar_url || localProfile?.avatar || avatars.lea,
      cover: data.cover_url || localProfile?.cover || "https://images.pexels.com/photos/8099796/pexels-photo-8099796.jpeg",
      memberSince: data.member_since || localProfile?.memberSince || "Septembre 2026",
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

  if (mergedProfile.name !== undefined) updateFields.name = mergedProfile.name;
  if (mergedProfile.city !== undefined) updateFields.city = mergedProfile.city;
  if (mergedProfile.bio !== undefined) updateFields.bio = mergedProfile.bio;
  if (mergedProfile.avatar !== undefined) updateFields.avatar_url = mergedProfile.avatar;
  if (mergedProfile.cover !== undefined) updateFields.cover_url = mergedProfile.cover;
  if (mergedProfile.isAdmin !== undefined) updateFields.is_admin = mergedProfile.isAdmin;

  try {
    // 1. Try UPDATE directly (compliant with "Users can update their own profile" RLS policy)
    const { data: updatedRows, error: updateError } = await supabase
      .from("profiles")
      .update(updateFields)
      .eq("id", userId)
      .select();

    if (updateError || !updatedRows || updatedRows.length === 0) {
      // 2. If row does not exist yet in profiles table, upsert with primary key id
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

export async function fetchActiveChallenge(): Promise<ChallengeData> {
  const cached = typeof window !== "undefined" ? localStorage.getItem("valuo_custom_challenge") : null;
  let localChallenge: ChallengeData = todayChallenge;
  if (cached) {
    try {
      localChallenge = { ...todayChallenge, ...JSON.parse(cached) };
    } catch {}
  }

  if (!isSupabaseConfigured) return localChallenge;

  try {
    const { data, error } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("active", true)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return localChallenge;

    const challenge = {
      id: data.id,
      theme: data.theme,
      date: new Date(data.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
      brief: data.brief,
      remaining: data.remaining || "6 h 24",
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("valuo_custom_challenge", JSON.stringify(challenge));
    }

    return challenge;
  } catch {
    return localChallenge;
  }
}

export async function saveActiveChallenge(challenge: Partial<ChallengeData>) {
  if (typeof window !== "undefined") {
    const existing = localStorage.getItem("valuo_custom_challenge");
    let merged = { ...todayChallenge, ...challenge };
    if (existing) {
      try { merged = { ...JSON.parse(existing), ...challenge }; } catch {}
    }
    localStorage.setItem("valuo_custom_challenge", JSON.stringify(merged));
  }

  if (!isSupabaseConfigured) return;

  try {
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

export async function createOfficialPost(userId: string, photoUrl: string, caption: string, isPinned = true) {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from("feed_posts")
      .insert({
        user_id: userId,
        photo_url: photoUrl,
        caption,
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

export async function deleteFeedPost(postId: string | number) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from("feed_posts").delete().eq("id", postId);
  } catch (err) {
    console.warn("Could not delete post:", err);
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

  const cached = typeof window !== "undefined" ? localStorage.getItem("valuo_mystery_item") : null;
  if (cached) {
    try { return { ...defaultMystery, ...JSON.parse(cached) }; } catch {}
  }

  return defaultMystery;
}

export async function saveMysteryItem(item: Partial<MysteryItemData>) {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("valuo_mystery_item");
    let merged = { ...item };
    if (cached) {
      try { merged = { ...JSON.parse(cached), ...item }; } catch {}
    }
    localStorage.setItem("valuo_mystery_item", JSON.stringify(merged));
  }
}

export async function fetchFeedPosts(currentUserId?: string): Promise<FeedPost[]> {
  if (!isSupabaseConfigured) return [pinnedGameMasterPost];

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

  if (error || !data || data.length === 0) return [pinnedGameMasterPost];

  return data.map((item: any) => {
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

    return {
      id: item.id,
      author: item.profiles?.name || "Anonyme",
      city: item.city || "France",
      avatar: item.profiles?.avatar_url || avatars.lea,
      photo: item.photo_url,
      caption: item.caption,
      time: item.is_pinned ? "Épinglé · 08:00" : timeStr,
      likes: item.likes_count || 0,
      liked: userLiked,
      isPinned: item.is_pinned,
      isOfficial: item.is_official,
      comments: formattedComments,
    };
  });
}

export async function createFeedPost(
  userId: string,
  photoUrl: string,
  caption: string,
  city?: string,
  challengeId?: string,
) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from("feed_posts")
    .insert({
      user_id: userId,
      photo_url: photoUrl,
      caption,
      city: city || "France",
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
      text,
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

export async function createSquadInDb(
  userId: string,
  squadName: string,
  _invitedFriends: string[] = [],
): Promise<GroupData | null> {
  if (!isSupabaseConfigured) return null;

  const code = `VALUO-${Math.floor(100 + Math.random() * 900)}`;

  const { data: squad, error } = await supabase
    .from("squads")
    .insert({
      name: squadName,
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

  // Insert current user member
  await supabase.from("squad_members").insert({
    squad_id: squad.id,
    user_id: userId,
    points: 0,
    rank_change: 0,
    is_npc: false,
  });

  // Insert NPC rivals to fill squad to 4
  const npcs = [
    { name: "Léon (IA)", avatar: avatars.samir },
    { name: "Camille (IA)", avatar: avatars.camille },
    { name: "Jeanne (IA)", avatar: avatars.ines },
  ];

  for (let i = 0; i < 3; i++) {
    await supabase.from("squad_members").insert({
      squad_id: squad.id,
      npc_name: npcs[i].name,
      npc_avatar: npcs[i].avatar,
      is_npc: true,
      points: 0,
      rank_change: 0,
      current_estimate: 55 + i * 8,
    });
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
