import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { seedDefaultAdmin, flushQueue, startAutoSync } from "@/lib/offline";
import { supabase } from "@/integrations/supabase/client";

// Mount the app FIRST — never block render on async work.
try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (e) {
  console.error("[boot] render failed", e);
  const root = document.getElementById("root");
  if (root) root.innerHTML = '<div style="padding:24px;font-family:sans-serif">Erreur de démarrage. Rechargez la page.</div>';
}

// Seed default admin so login works in airplane mode on first run
Promise.resolve().then(() => seedDefaultAdmin()).catch((e) => console.warn("[boot] seed failed", e));

// Register Service Worker only outside Lovable preview/iframe contexts
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if ("serviceWorker" in navigator) {
  if (isPreviewHost || isInIframe) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
  } else if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("SW failed", e));
    });
  }
}

// Auto-sync loop: retry failed mutations periodically + on every online event.
startAutoSync(supabase, 15000);
// Also flush immediately on the explicit online event (already handled inside startAutoSync but kept for first run)
if (navigator.onLine) setTimeout(() => { flushQueue(supabase).catch(() => {}); }, 2000);
