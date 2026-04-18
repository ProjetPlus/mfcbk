import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { seedDefaultAdmin, flushQueue } from "@/lib/offline";
import { supabase } from "@/integrations/supabase/client";

createRoot(document.getElementById("root")!).render(<App />);

// Seed default admin so login works in airplane mode on first run
seedDefaultAdmin();

// Register Service Worker only outside Lovable preview/iframe contexts
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if ("serviceWorker" in navigator) {
  if (isPreviewHost || isInIframe) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  } else if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("SW failed", e));
    });
  }
}

// Flush sync queue when network returns
window.addEventListener("online", () => { flushQueue(supabase); });
if (navigator.onLine) setTimeout(() => flushQueue(supabase), 2000);
