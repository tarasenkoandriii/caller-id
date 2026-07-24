import { useEffect, useRef, useState } from 'react';
import { api, saveToken } from '../api';

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleLoginButton({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // gsi/client грузится асинхронно в index.html — ждём, пока появится window.google
    const check = setInterval(() => {
      if (window.google?.accounts?.id) {
        setScriptReady(true);
        clearInterval(check);
      }
    }, 100);
    return () => clearInterval(check);
  }, []);

  useEffect(() => {
    if (!scriptReady || !buttonRef.current || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: { credential: string }) => {
        try {
          const { accessToken } = await api.loginWithGoogle(response.credential);
          saveToken(accessToken);
          onSuccess();
        } catch (err: any) {
          onError(err.message || 'Не удалось войти через Google');
        }
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      width: 320,
      text: 'signin_with',
    });
  }, [scriptReady, onSuccess, onError]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-xs text-neutral-500">
        Вход через Google не настроен (VITE_GOOGLE_CLIENT_ID пуст)
      </p>
    );
  }

  return <div ref={buttonRef} className="flex justify-center" />;
}
