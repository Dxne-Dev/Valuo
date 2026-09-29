import { type GroupMember } from "@/data";

export function computeRankings(
  members: GroupMember[],
  userAmount: number,
  realPrice: number,
) {
  const calculated = members
    .map((member) => ({
      ...member,
      estimate: member.id === 1 ? userAmount : member.estimate ?? 0,
    }))
    .sort(
      (a, b) =>
        Math.abs((a.estimate ?? 0) - realPrice) -
        Math.abs((b.estimate ?? 0) - realPrice),
    );

  const userRank = calculated.findIndex((member) => member.id === 1) + 1;
  const earned = Math.max(0, 50 - Math.round(Math.abs(userAmount - realPrice) * 2));

  return { results: calculated, userRank, earned };
}
