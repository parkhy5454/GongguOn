
'use client';
import { useEffect, useState } from 'react';

export function usePush(userId) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
    checkSubscribed();
  }, []);

  const checkSubscribed = async () => {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setIsSubscribed(!!sub);
  };

  const subscribe = async () => {
    if (!userId) {
      alert('로그인 후 알림을 켤 수 있어요');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription: sub })
      });
      
      setIsSubscribed(true);
      alert('알림 켜짐! 마감 3시간 전에 알려드릴게요 🔔');
    } catch (e) {
      console.error(e);
      alert('알림 설정 실패: ' + e.message);
    }
  };

  return { isSubscribed, permission, subscribe };
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
