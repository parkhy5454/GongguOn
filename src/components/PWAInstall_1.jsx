
'use client';
import { useEffect, useState } from 'react';

export default function PWAInstall() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    });
  }, []);

  if (!show) return null;

  return (
    <div className="md:hidden fixed top-[56px] left-3 right-3 bg-black text-white rounded-2xl p-4 flex justify-between items-center z-40 shadow-2xl">
      <div className="text-sm">
        <p className="font-bold">📲 바탕화면에 공구온 설치하기</p>
        <p className="text-xs opacity-70">매주 월요일 알림 받고 20% 싸게 사요</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setShow(false)} className="text-xs opacity-60 px-2">닫기</button>
        <button
          onClick={async () => {
            deferred.prompt();
            const { outcome } = await deferred.userChoice;
            setShow(false);
          }}
          className="bg-white text-black px-3 py-1.5 rounded-full text-xs font-bold"
        >
          설치
        </button>
      </div>
    </div>
  );
}
