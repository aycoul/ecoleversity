import { AccessToken } from "livekit-server-sdk";

type UserRole = "teacher" | "parent" | "admin";

type TokenInput = {
  roomName: string;
  userId: string;
  displayName: string;
  userEmail: string | null;
  role: UserRole;
};

export function getLiveKitUrl(): string {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!url) throw new Error("NEXT_PUBLIC_LIVEKIT_URL is not set");
  return url;
}

export function getRoomName(liveClassId: string): string {
  return `session-${liveClassId}`;
}

export async function generateAccessToken({
  roomName,
  userId,
  displayName,
  userEmail,
  role,
}: TokenInput): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set");
  }

  const isTeacher = role === "teacher";

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: displayName,
    metadata: JSON.stringify({ role, email: userEmail }),
    ttl: "1h",
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: isTeacher,
    roomRecord: isTeacher,
  });

  return at.toJwt();
}
