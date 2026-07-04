import type { FriendLastVote, FriendListItem, FriendRequestItem } from "@/types";

export function buildFriendInviteUrl(userId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/compte?addFriend=${encodeURIComponent(userId)}`;
}

export function parseFriendIdFromInvite(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const fromQuery = url.searchParams.get("addFriend");
      if (fromQuery) return fromQuery;
    }
  } catch {
    /* not a URL */
  }

  const uuidMatch = trimmed.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
  );
  return uuidMatch?.[0] ?? null;
}

export function formatFriendError(message: string): string {
  if (message.includes("USER_NOT_FOUND")) return "Utilisateur introuvable.";
  if (message.includes("FRIEND_SELF")) return "Tu ne peux pas t'ajouter toi-même.";
  if (message.includes("ALREADY_FRIENDS")) return "Vous êtes déjà amis.";
  if (message.includes("AUTH_REQUIRED")) return "Connecte-toi pour gérer tes amis.";
  if (message.includes("NOT_FRIENDS")) return "Cet utilisateur n'est pas dans tes amis.";
  if (message.includes("USER_BLOCKED")) return "Action impossible avec cet utilisateur.";
  if (message.includes("REQUEST_NOT_FOUND")) return "Demande introuvable.";
  if (message.includes("FORBIDDEN")) return "Action non autorisée.";
  return message;
}

export type FriendsApi = {
  listRequests: () => Promise<FriendRequestItem[]>;
  countPending: () => Promise<number>;
  listFriends: () => Promise<FriendListItem[]>;
  sendRequestByUserId: (userId: string) => Promise<void>;
  sendRequestByPseudo: (pseudo: string) => Promise<void>;
  respondRequest: (requestId: string, accept: boolean) => Promise<void>;
  getFriendLastVote: (friendId: string) => Promise<FriendLastVote>;
};

export function mapFriendLastVote(raw: unknown): FriendLastVote {
  const data = (raw ?? {}) as Record<string, unknown>;
  const choice = data.choice;
  return {
    hidden: Boolean(data.hidden),
    voted: Boolean(data.voted),
    choice: choice === "pour" || choice === "contre" || choice === "neutre" ? choice : null,
    question_id: typeof data.question_id === "string" ? data.question_id : null,
    question_text: typeof data.question_text === "string" ? data.question_text : null,
    options: Array.isArray(data.options) ? (data.options as FriendLastVote["options"]) : null,
  };
}
