// Hook to track online/offline state and pending sync queue size
import { useEffect, useState } from "react";
import { getQueue, isOnline, flushQueue } from "@/lib/offline";
import { supabase } from "@/integrations/supabase/client";

export function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(isOnline());
  const [queueCount, setQueueCount] = useState<number>(getQueue().length);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const update = () => {
      setOnline(isOnline());
      setQueueCount(getQueue().length);
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const interval = setInterval(update, 3000);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      clearInterval(interval);
    };
  }, []);

  const syncNow = async () => {
    if (!isOnline()) return 0;
    setSyncing(true);
    const n = await flushQueue(supabase);
    setQueueCount(getQueue().length);
    setSyncing(false);
    return n;
  };

  return { online, queueCount, syncing, syncNow };
}
