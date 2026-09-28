import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl !== "https://your-project-id.supabase.co",
);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  },
);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          city: string;
          bio: string;
          avatar_url: string;
          cover_url: string;
          member_since: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      daily_challenges: {
        Row: {
          id: string;
          theme: string;
          brief: string;
          date: string;
          active: boolean;
          created_at: string;
        };
      };
      feed_posts: {
        Row: {
          id: string;
          user_id: string;
          challenge_id: string | null;
          photo_url: string;
          caption: string;
          city: string;
          is_pinned: boolean;
          is_official: boolean;
          likes_count: number;
          comments_count: number;
          created_at: string;
        };
      };
      post_likes: {
        Row: {
          user_id: string;
          post_id: string;
          created_at: string;
        };
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          text: string;
          created_at: string;
        };
      };
      friendships: {
        Row: {
          user_id: string;
          friend_id: string;
          created_at: string;
        };
      };
      squads: {
        Row: {
          id: string;
          name: string;
          code: string;
          week_number: number;
          status: "active" | "completed" | "archived";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      squad_members: {
        Row: {
          id: string;
          squad_id: string;
          user_id: string | null;
          npc_name: string | null;
          npc_avatar: string | null;
          is_npc: boolean;
          points: number;
          rank_change: number;
          current_estimate: number | null;
          joined_at: string;
        };
      };
      mystery_boxes: {
        Row: {
          id: string;
          date: string;
          day_number: number;
          item_name: string;
          description: string;
          photo_url: string;
          real_price: number;
          history_details: string;
          active: boolean;
          created_at: string;
        };
      };
      box_estimates: {
        Row: {
          id: string;
          mystery_box_id: string;
          squad_id: string;
          squad_member_id: string;
          user_id: string | null;
          estimated_price: number;
          points_earned: number;
          submitted_at: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "challenge" | "friend" | "like" | "comment" | "mystery";
          title: string;
          message: string;
          target_tab: "feed" | "game" | "group" | "profile" | "notifications";
          target_post_id: string | null;
          actor_id: string | null;
          read: boolean;
          created_at: string;
        };
      };
    };
  };
};
