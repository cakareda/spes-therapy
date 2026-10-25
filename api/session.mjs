// GET /api/session  →  { loggedIn: true/false }
import { isLoggedIn, json } from "../lib/auth.mjs";

export function GET(req) {
  return json({ loggedIn: isLoggedIn(req) });
}

