import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { type GroupData, type GroupMember, avatars } from "@/data";
import { sanitizeInput } from "@/lib/security";
import { getCurrentWeekNumber } from "@/lib/dateUtils";
import {
  createFeedPost,
  saveActiveRecruitmentLocalCache,
  removeActiveRecruitmentLocalCache,
} from "@/lib/api";

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
    week: squad.week_number || getCurrentWeekNumber(),
    members,
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

  // Clean up any existing squad membership first to avoid conflicts
  await leaveSquadInDb(userId);

  const code = `VALUO-${Math.floor(100 + Math.random() * 900)}`;

  const { data: squad, error } = await supabase
    .from("squads")
    .insert({
      name: sanitizeInput(squadName),
      code,
      created_by: userId,
      week_number: getCurrentWeekNumber(),
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
