import { verifyToken } from "../utils/jwt.js";
import * as User from "../models/User.js";
import * as ApiKey from "../models/ApiKey.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = verifyToken(token);
    const user = User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Invalid session." });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session." });
  }
}

// Attaches req.user if a valid token is present, but does not block the request otherwise.
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    req.user = User.findById(payload.sub);
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}

// Same as optionalAuth, but also accepts a personal API key via the
// `X-API-Key` header — lets /api/execute be called programmatically
// (scripts, CI, other tools) without a browser session/JWT, while staying
// fully optional so anonymous execution still works exactly as before.
export async function optionalAuthOrApiKey(req, _res, next) {
  const apiKeyHeader = req.headers["x-api-key"];
  if (apiKeyHeader) {
    const found = ApiKey.findByRawKey(String(apiKeyHeader));
    if (found) {
      req.user = User.findById(found.userId);
      req.apiKeyId = found.id;
      ApiKey.touchLastUsed(found.id);
      return next();
    }
    // An API key was supplied but didn't match anything — fail closed
    // rather than silently falling through to anonymous, so a typo'd key
    // doesn't quietly behave as "not logged in" instead of erroring.
    return next({ status: 401, publicMessage: "Invalid API key." });
  }
  return optionalAuth(req, _res, next);
}
