
'use client';
import { useEffect, useState } from 'react';

export default function LiveParticipants({ productId, initialCount }) {
  const [participants, setParticipants] = useState([]);
  const [count, setCount] = useState(initialCount || 0);

  useEffect(() => {
    // Socket.io로 실시간 참여 알림 구독
    // io.emit('order:created', { productId, user: { name: '김**' } })
    if (typeof window !== 'undefined' && window.io) {
      const socket = window.io();
      socket.on(`product:${productId}:join`, (data) => {
        setParticipants(prev => [data, ...prev].slice(0,5));
        setCount(c => c + 1);
        // 5초 후 사라짐
        setTimeout(() => setParticipants(prev => prev.slice(1)), 5000);
      });
      return () => socket.disconnect();
    }
  }, [productId]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span className="font-bold">실시간 {count}명 참여중</span>
      </div>
      <div className="space-y-1">
        {participants.map((p, i) => (
          <div key={i} className="text-xs bg-black text-white px-3 py-1.5 rounded-full inline-block mr-2 animate-slideIn">
            {p.name || '익명'}님이 방금 참여했어요! 🎉
          </div>
        ))}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-orange-400 to-red-500 h-full transition-all duration-1000"
          style={{ width: `${Math.min(100, (count / (productId.nextGoal || 50)) * 100)}%` }}
        />
      </div>
    </div>
  );
}
