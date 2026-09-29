import { useState, useCallback } from "react";
import { type GroupData } from "@/data";
import {
  fetchUserSquad,
  createSquadInDb,
  joinSquadByCode,
  leaveSquadInDb,
  republishSquadRecruitment,
} from "../services/squadService";

export function useSquad(userId?: string) {
  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSquad = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserSquad(userId);
      setGroup(data);
    } catch (err: any) {
      setError(err?.message || "Erreur lors du chargement de l'escouade");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createGroup = useCallback(
    async (name: string, invitedFriends: string[] = [], fillWithNpc = false) => {
      if (!userId) return null;
      setLoading(true);
      try {
        const newGroup = await createSquadInDb(userId, name, invitedFriends, fillWithNpc);
        setGroup(newGroup);
        return newGroup;
      } catch (err: any) {
        setError(err?.message || "Erreur lors de la création de l'escouade");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  const joinGroup = useCallback(
    async (code: string) => {
      if (!userId) return null;
      setLoading(true);
      try {
        const joined = await joinSquadByCode(userId, code);
        setGroup(joined);
        return joined;
      } catch (err: any) {
        setError(err?.message || "Erreur lors de l'accès à l'escouade");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  const leaveGroup = useCallback(async () => {
    if (!userId) return { remainingCount: 0 };
    setLoading(true);
    try {
      const res = await leaveSquadInDb(userId, group?.id, group?.code);
      setGroup(null);
      return res;
    } catch (err: any) {
      setError(err?.message || "Erreur en quittant l'escouade");
      return { remainingCount: 0 };
    } finally {
      setLoading(false);
    }
  }, [userId, group]);

  const republishRecruitment = useCallback(
    async (city?: string) => {
      if (!userId || !group) return null;
      return await republishSquadRecruitment(userId, group.code, group.name, city);
    },
    [userId, group],
  );

  return {
    group,
    setGroup,
    loading,
    error,
    loadSquad,
    createGroup,
    joinGroup,
    leaveGroup,
    republishRecruitment,
  };
}
