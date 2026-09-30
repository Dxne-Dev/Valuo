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
  deleteFeedPost,
  deleteSquadAdmin,
  type MysteryItemData,
  saveActiveChallenge,
  saveMysteryItem,
  togglePinPost,
  updateFeedPost,
  uploadImage,
} from "@/lib/api";

export {
  fetchAdminMetrics,
  fetchAdminSquadsList,
  createOfficialPost,
  updateFeedPost,
  togglePinPost,
  deleteFeedPost,
  deleteSquadAdmin,
  deactivateActiveChallenge,
  saveActiveChallenge,
  saveMysteryItem,
  uploadImage,
};
export type { AdminMetrics, AdminSquadSummary, ChallengeData, MysteryItemData };

