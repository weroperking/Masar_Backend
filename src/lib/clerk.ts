import { createClerkClient } from "@clerk/backend";

export function createClerkAuth(env: { CLERK_SECRET_KEY: string }) {
  const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

  return async (token: string) => {
    const session = await clerkClient.verifySession(token);
    return {
      userId: session.userId,
      orgId: session.orgId,
    };
  };
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}
