import {
  type AdminMetrics,
  type AdminSquadSummary,
  fetchAdminMetrics,
  fetchAdminSquadsList,
} from "@/lib/adminApi";
import {
  type ChallengeData,
  createOfficialPost,
  deactivateActiveChallenge,
  type MysteryItemData,
  saveActiveChallenge,
  saveMysteryItem,
} from "@/lib/api";

export {
  fetchAdminMetrics,
  fetchAdminSquadsList,
  createOfficialPost,
  deactivateActiveChallenge,
  saveActiveChallenge,
  saveMysteryItem,
};
export type { AdminMetrics, AdminSquadSummary, ChallengeData, MysteryItemData };
