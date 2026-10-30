"use client";

import Script from "next/script";
import { useRef, useState } from "react";

type GoogleIdentityApi = {
  initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
  renderButton: (element: HTMLElement, options: { type: string; theme: string; size: string; text: string; shape: string; width: number; locale: string }) => void;
};

export function GoogleSignInButton({ mode, onCredential }: {
  mode: "signup" | "signin";
  onCredential: (credential: string) => void;
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const container = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);

  if (!clientId) {
    return <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">Acesso com Google aguardando a configuração do ID de cliente.</p>;
  }

  return <div className="flex min-h-11 flex-col items-center justify-center gap-2">
    <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onError={() => setLoadError(true)} onReady={() => {
      const api = (window as Window & { google?: { accounts?: { id?: GoogleIdentityApi } } }).google?.accounts?.id;
      if (!api || !container.current) { setLoadError(true); return; }
      container.current.replaceChildren();
      api.initialize({ client_id: clientId, callback: (response) => {
        if (response.credential) onCredential(response.credential);
      } });
      api.renderButton(container.current, {
        type: "standard", theme: "outline", size: "large", text: mode === "signup" ? "signup_with" : "signin_with",
        shape: "rectangular", width: Math.min(container.current.clientWidth || 320, 400), locale: "pt-BR",
      });
    }} />
    <div ref={container} className="w-full min-w-0 text-center" />
    {loadError && <p role="alert" className="text-center text-xs text-rose-700">Não foi possível carregar o botão do Google. Tente novamente mais tarde.</p>}
  </div>;
}
