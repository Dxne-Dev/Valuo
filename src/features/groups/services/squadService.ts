import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { type GroupData, type GroupMember, avatars } from "@/data";
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

export { createSquadInDb } from "@/lib/api";

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
