// GET /api/session  →  { loggedIn: true/false }
import { isLoggedIn, json } from "../lib/auth.mjs";

export default async (req) => json({ loggedIn: isLoggedIn(req) });

export const config = { path: "/api/session" };
