import jwt from "jsonwebtoken";

// .env files edited on Windows (Notepad, some IDE save modes) can leave a
// trailing \r or stray quote on a value, and dotenv does NOT override a
// variable that's already set at the OS level — so a leftover system/user
// environment variable named JWT_EXPIRES_IN (e.g. from an earlier
// experiment) silently wins over whatever is in .env. Trimming alone isn't
// enough to catch that, so this validates the value against the exact
// format jsonwebtoken accepts and falls back to a safe default — with a
// warning — for literally anything else, instead of crashing the request.
const DURATION_RE =
  /^-?(\d+(\.\d+)?|\.\d+)\s*(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i;

function resolveExpiresIn() {
  const raw = String(process.env.JWT_EXPIRES_IN ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();

  if (!raw) return "7d";
  if (/^\d+$/.test(raw)) return Number(raw); // plain number of seconds
  if (DURATION_RE.test(raw)) return raw;

  console.warn(
    `[jwt] JWT_EXPIRES_IN=${JSON.stringify(raw)} isn't a valid duration (try "7d", "12h", or a plain number of seconds like 3600). ` +
      `Falling back to "7d". If you didn't set it to this, check for a Windows system/user environment variable of the same name — ` +
      `.env does not override those.`
  );
  return "7d";
}

export function signToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: resolveExpiresIn(),
  });
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
