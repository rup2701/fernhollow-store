"use client";

import { createContext, useCallback, useContext, useState } from "react";

/**
 * A single polite live region so screen-reader users hear important state
 * changes (cart updates, removals) that sighted users see on screen.
 */
const AnnouncerContext = createContext<(message: string) => void>(() => {});

export function AnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");

  const announce = useCallback((next: string) => {
    // Clear first so repeating the same message is still announced.
    setMessage("");
    window.setTimeout(() => setMessage(next), 50);
  }, []);

  return (
    <AnnouncerContext.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {message}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnounce() {
  return useContext(AnnouncerContext);
}
