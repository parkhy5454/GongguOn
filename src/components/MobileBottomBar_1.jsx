
'use client';
import { useState, useEffect } from 'react';

export default function MobileBottomBar({ product, currentCount, onJoin }) {
  const tiers = product.priceTiers || [{count:10, price:19800},{count:30, price:17800},{count:50, price:14800}];
  const sorted = [...tiers].sort((a,b) => a.count - b.count);
  const currentPrice = [...sorted].reverse().find(t => currentCount >= t.count)?.price || product.basePrice || product.price;
  const nextTier = sorted.find(t => t.count > currentCount);

  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* Spacer so content not hidden behind fixed bar */}
      <div className="h-20 md:hidden" />

      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* Next tier hint */}
        {nextTier && (
          <div className="bg-orange-500 text-white text-xs text-center py-1.5 font-bold animate-pulse">
            🔥 {nextTier.count - currentCount}명만 더 모이면 { (currentPrice - nextTier.price).toLocaleString()}원 더 싸져요!
          </div>
        )}

        <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">{currentCount}명 참여중 • {nextTier ? `${nextTier.count}명 목표` : '최저가 달성!'}</span>
            <span className="text-xl font-black">{currentPrice.toLocaleString()}원</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const url = window.location.href;
                if (navigator.share) {
                  navigator.share({ title: product.title, url });
                } else {
                  navigator.clipboard.writeText(url);
                  alert('링크 복사! 카톡에 붙여넣기 하세요');
                }
              }}
              className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl"
            >
              📤
            </button>
            <button
              onClick={onJoin}
              className="bg-black text-white px-6 h-12 rounded-xl font-bold text-[15px] active:scale-95 transition"
            >
              참여하기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
