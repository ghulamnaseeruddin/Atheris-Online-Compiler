import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import * as User from "../models/User.js";

// Trims whitespace/newlines and strips a single pair of wrapping quotes —
// guards against credentials picking up a trailing \r or accidental quotes
// when copy-pasted into .env on Windows. A mismatched client secret is the
// classic cause of GitHub/Google returning "invalid_grant" on token exchange.
function env(name) {
  const raw = process.env[name];
  if (!raw) return raw;
  return raw.trim().replace(/^["']|["']$/g, "").trim();
}

// Each strategy "find or creates" a user keyed on (provider, providerId).
// Social accounts never get a passwordHash — they can only log in via OAuth
// unless the user later sets a password (not implemented in this scaffold,
// listed on the roadmap as "account linking").

function findOrCreateOAuthUser({ provider, providerId, email, displayName, avatarUrl }) {
  let user = User.findByProviderId(provider, providerId);
  if (user) return user;

  // If an account with this email already exists (e.g. signed up with a
  // password first), link the OAuth identity instead of creating a duplicate.
  if (email) {
    user = User.findByEmail(email);
    if (user) return user;
  }

  return User.create({
    provider,
    providerId,
    email: email || undefined,
    username: displayName ? `${displayName.replace(/\s+/g, "").toLowerCase()}_${providerId.slice(-4)}` : undefined,
    avatarUrl,
  });
}

export function configurePassport() {
  const githubId = env("GITHUB_CLIENT_ID");
  const githubSecret = env("GITHUB_CLIENT_SECRET");

  if (githubId && githubSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: githubId,
          clientSecret: githubSecret,
          callbackURL: env("GITHUB_CALLBACK_URL"),
          scope: ["user:email"],
          // GitHub's API can reset the connection ("socket hang up" /
          // ECONNRESET) on the follow-up request to /user/emails when no
          // User-Agent header is sent — GitHub requires one on all API calls.
          customHeaders: { "User-Agent": "atheris-online-compiler" },
        },
        (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const user = findOrCreateOAuthUser({
              provider: "github",
              providerId: profile.id,
              email,
              displayName: profile.username || profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
            });
            done(null, user);
          } catch (err) {
            done(err);
          }
        }
      )
    );
  } else {
    console.warn("[oauth] GitHub OAuth not configured — set GITHUB_CLIENT_ID/SECRET in .env");
  }

  const googleId = env("GOOGLE_CLIENT_ID");
  const googleSecret = env("GOOGLE_CLIENT_SECRET");

  if (googleId && googleSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleId,
          clientSecret: googleSecret,
          callbackURL: env("GOOGLE_CALLBACK_URL"),
          scope: ["profile", "email"],
        },
        (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const user = findOrCreateOAuthUser({
              provider: "google",
              providerId: profile.id,
              email,
              displayName: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
            });
            done(null, user);
          } catch (err) {
            done(err);
          }
        }
      )
    );
  } else {
    console.warn("[oauth] Google OAuth not configured — set GOOGLE_CLIENT_ID/SECRET in .env");
  }

  return passport;
}
