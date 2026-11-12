import { headers } from "next/headers";
import { auth } from "../auth";
export async function socialSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session
    ? { userId: session.user.id, sessionId: session.session.id }
    : null;
}
