import { useEffect, useRef, useState } from "react";

const API =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = API;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject();
    script.onerror = () => {
      script.remove();
      reject();
    };
    document.head.append(script);
  }).catch(() => {
    loading = null;
    throw new Error("Não foi possível carregar a verificação de segurança.");
  });
  return loading;
}

export default function CheckoutCaptcha({ siteKey, onToken, attempt }) {
  const element = useRef(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let widget;
    let api;
    loadTurnstile()
      .then((turnstile) => {
        if (!active) return;
        api = turnstile;
        widget = turnstile.render(element.current, {
          sitekey: siteKey,
          language: "pt-br",
          callback: (token) => {
            setError("");
            onToken(token);
          },
          "expired-callback": () => onToken(""),
          "error-callback": () => {
            onToken("");
            setError("A verificação de segurança falhou. Tente novamente.");
          },
        });
      })
      .catch((cause) => active && setError(cause.message));
    return () => {
      active = false;
      if (widget != null) api.remove(widget);
    };
  }, [siteKey, onToken, attempt]);

  return (
    <>
      <div ref={element} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

export function useAuthCaptcha(active) {
  const siteKey = import.meta.env.VITE_CAPTCHA_SITE_KEY || "";
  const [token, onToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const required = Boolean(siteKey && active);
  return {
    required,
    token,
    reset: () => {
      onToken("");
      setAttempt((value) => value + 1);
    },
    widget: required && (
      <CheckoutCaptcha siteKey={siteKey} onToken={onToken} attempt={attempt} />
    ),
  };
}
