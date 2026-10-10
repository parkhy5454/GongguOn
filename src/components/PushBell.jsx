
'use client';
import { usePush } from '@/src/hooks/usePush';

export default function PushBell({ userId }) {
  const { isSubscribed, permission, subscribe } = usePush(userId);

  if (isSubscribed) {
    return (
      <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-full text-xs">
        🔔 알림 켜짐
      </div>
    );
  }

  return (
    <button
      onClick={subscribe}
      className="bg-black text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5"
    >
      🔔 마감 알림 받기
    </button>
  );
}

export function PushNudge({ product, currentCount }) {
  const nextTier = (product.priceTiers || []).find(t => t.count > currentCount);
  if (!nextTier) return null;
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex justify-between items-center">
      <div className="text-xs">
        <p className="font-bold">🔥 {nextTier.count - currentCount}명만 더 모이면 할인!</p>
        <p className="text-gray-500">알림 켜두면 달성되면 바로 알려드려요</p>
      </div>
      <div className="text-orange-600 text-lg">→</div>
    </div>
  );
}
