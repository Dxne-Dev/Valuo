import { supabase, isSupabaseConfigured } from "./supabase";

export type AdminMetrics = {
  totalPlayers: number;
  totalPosts: number;
  totalSquads: number;
  totalEstimates: number;
};

export type AdminSquadSummary = {
  id: string;
  name: string;
  code: string;
  weekNumber: number;
  membersCount: number;
  topScore: number;
};

export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  if (!isSupabaseConfigured) {
    return {
      totalPlayers: 1,
      totalPosts: 1,
      totalSquads: 1,
      totalEstimates: 0,
    };
  }

  try {
    const [playersRes, postsRes, squadsRes, estimatesRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("feed_posts").select("id", { count: "exact", head: true }),
      supabase.from("squads").select("id", { count: "exact", head: true }),
      supabase.from("box_estimates").select("id", { count: "exact", head: true }),
    ]);

    return {
      totalPlayers: playersRes.count || 1,
      totalPosts: postsRes.count || 1,
      totalSquads: squadsRes.count || 1,
      totalEstimates: estimatesRes.count || 0,
    };
  } catch (err) {
    console.warn("fetchAdminMetrics error:", err);
    return {
      totalPlayers: 1,
      totalPosts: 1,
      totalSquads: 1,
      totalEstimates: 0,
    };
  }
}

export async function fetchAdminSquadsList(): Promise<AdminSquadSummary[]> {
  if (!isSupabaseConfigured) {
    return [
      {
        id: "squad-demo",
        name: "Les As du Flair",
        code: "VALUO-482",
        weekNumber: 38,
        membersCount: 4,
        topScore: 248,
      },
    ];
  }

  try {
    const { data, error } = await supabase
      .from("squads")
      .select(`
        id,
        name,
        code,
        week_number,
        squad_members (
          points
        )
      `)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((s: any) => {
      const members = s.squad_members || [];
      const topScore = members.reduce((max: number, m: any) => Math.max(max, m.points || 0), 0);
      return {
        id: s.id,
        name: s.name,
        code: s.code,
        weekNumber: s.week_number || 38,
        membersCount: members.length,
        topScore,
      };
    });
  } catch (err) {
    console.warn("fetchAdminSquadsList error:", err);
    return [];
  }
}
