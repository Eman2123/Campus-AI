"use client";

import { useEffect, useRef, useState } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GIS_SRC = "https://accounts.google.com/gsi/client";

type GoogleId = {
  initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

/** Renders Google's own button, only when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set. */
export function GoogleButton({
  onCredential,
  text = "continue_with",
}: {
  onCredential: (credential: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
}) {
  const holder = useRef<HTMLDivElement>(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    function draw() {
      if (cancelled || !holder.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (r) => cb.current(r.credential),
      });
      window.google.accounts.id.renderButton(holder.current, {
        theme: "outline",
        size: "large",
        text,
        shape: "rectangular",
        width: Math.min(holder.current.offsetWidth || 380, 400),
      });
    }

    if (window.google) {
      draw();
    } else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = GIS_SRC;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", draw);
      script.addEventListener("error", () => !cancelled && setFailed(true));
    }
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID || failed) return null;

  return (
    <>
      <div className="flex items-center gap-3 font-pixel text-xs font-semibold text-muted-onPaper" aria-hidden="true">
        <span className="h-0.5 flex-1 bg-brand-black/20" />
        or
        <span className="h-0.5 flex-1 bg-brand-black/20" />
      </div>
      <div ref={holder} className="min-h-[44px] w-full" />
    </>
  );
}
