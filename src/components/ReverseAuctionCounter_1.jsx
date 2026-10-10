
'use client';
import { useEffect, useState } from 'react';

// props: product = { priceTiers: [{count, price}], currentCount, basePrice }
export default function ReverseAuctionCounter({ product, currentCount }) {
  const tiers = product.priceTiers || [
    { count: 10, price: 19800 },
    { count: 30, price: 17800 },
    { count: 50, price: 14800 },
  ];
  const sorted = [...tiers].sort((a,b) => a.count - b.count);
  const nextTier = sorted.find(t => t.count > currentCount);
  const currentPrice = [...sorted].reverse().find(t => currentCount >= t.count)?.price || product.basePrice;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl p-5">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-orange-600">🔥 지금 {currentCount}명 참여중!</span>
        <span className="text-2xl font-black text-red-600">{currentPrice.toLocaleString()}원</span>
      </div>
      <div className="space-y-2">
        {sorted.map((tier, i) => {
          const achieved = currentCount >= tier.count;
          const remaining = Math.max(0, tier.count - currentCount);
          return (
            <div key={i} className={`flex justify-between p-2 rounded-lg ${achieved ? 'bg-green-100 text-green-700' : 'bg-white'}`}>
              <span>{achieved ? '✅' : '⏳'} {tier.count}명 달성</span>
              <span className="font-bold">{tier.price.toLocaleString()}원 {achieved ? '' : `(${remaining}명 남음)`}</span>
            </div>
          );
        })}
      </div>
      {nextTier && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 mb-2">친구 1명 초대하면 내 가격도 같이 내려가요!</p>
          <button 
            onClick={() => {
              const url = `${window.location.origin}/p/${product.id}?ref=${localStorage.getItem('inviteCode')||'mycode'}`;
              navigator.clipboard.writeText(url);
              alert('초대 링크 복사됨! 카톡에 붙여넣으세요');
            }}
            className="w-full bg-black text-white py-3 rounded-xl font-bold"
          >
            카톡으로 초대하기 (광고비 0원)
          </button>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-3 text-center">
        쿠팡 보관료 8% + 광고비 15% + 폐기 5% = 28%를 없애서 더 싸게 드립니다.
      </p>
    </div>
  );
}
