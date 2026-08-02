import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { ThemeProvider, useTheme } from "./lib/ThemeContext";
import { AIProvider } from "./lib/AIContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AIPanel from "./components/AIPanel";
import CommandPalette from "./components/CommandPalette";
import RequireAuth from "./components/RequireAuth";
import Landing from "./pages/Landing";
import EditorPage from "./pages/EditorPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import OAuthCallback from "./pages/OAuthCallback";
import History from "./pages/History";
import Profile from "./pages/Profile";
import ApiKeys from "./pages/ApiKeys";
import Analytics from "./pages/Analytics";
import Security from "./pages/Security";
import Webhooks from "./pages/Webhooks";
import Embed from "./pages/Embed";
import Leaderboard from "./pages/Leaderboard";
import Settings from "./pages/Settings";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

// Once a user is signed in, their saved Appearance preference (Settings →
// Appearance) becomes the source of truth for this device. It's only
// applied when the account identity changes (i.e. on login/app load), not
// on every render, so a manual toggle in Settings isn't immediately
// clobbered by this same effect re-running.
function AppearanceSync() {
  const { user } = useAuth();
  const { setMode } = useTheme();

  useEffect(() => {
    if (user?.appearance) setMode(user.appearance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return null;
}

function AppShell() {
  const location = useLocation();
  // The embed route is meant to be dropped into someone else's page via
  // <iframe> (see EditorPage's "Embed" button) — it renders bare, with none
  // of Atheris's own chrome, so it doesn't look out of place embedded
  // inside a blog post or README. It's intentionally the one surface that
  // stays reachable without an Atheris account, since the whole point is
  // that someone else's (anonymous) site visitors can run the snippet.
  const isEmbed = location.pathname.startsWith("/embed/");

  if (isEmbed) {
    return (
      <Routes>
        <Route path="/embed/:id" element={<Embed />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-charcoal-950 dark:bg-charcoal-950 dark:text-white/90">
      <AppearanceSync />
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Auth surfaces are the only pages reachable without an account —
              everything else requires being logged in (see RequireAuth). */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />

          <Route element={<RequireAuth />}>
            <Route path="/" element={<Landing />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/api-keys" element={<ApiKeys />} />
            <Route path="/settings/webhooks" element={<Webhooks />} />
            <Route path="/settings/security" element={<Security />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/u/:username" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </main>
      {/* Per brief: the attribution footer appears on every page, including the editor
          (it sits below the fixed-height workspace, reachable by scrolling). */}
      <Footer />
      <AIPanel />
      <CommandPalette />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AIProvider>
          <AppShell />
        </AIProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
