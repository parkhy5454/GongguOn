
'use client';
// 기존 page.jsx에 이렇게 추가하세요

import ReverseAuctionCounter from '@/src/components/ReverseAuctionCounter';
import MobileBottomBar from '@/src/components/MobileBottomBar';
import PWAInstall from '@/src/components/PWAInstall';
import RefurbishedBadge from '@/src/components/RefurbishedBadge';

export function MobileOptimizedProduct({ product, currentCount }) {
  return (
    <div className="min-h-screen bg-white pb-20">
      <PWAInstall />

      {/* 기존 이미지 슬라이드 */}

      <div className="px-4 py-4 space-y-4 max-w-[600px] mx-auto">
        {product.isRefurbished && <RefurbishedBadge product={product} />}

        {/* 기존 제목/가격 대신 역경매 카운터가 가격 역할 */}
        <ReverseAuctionCounter product={product} currentCount={currentCount} />

        {/* 기존 설명 */}
      </div>

      {/* 하단 고정바 - 모바일에서만 보임 */}
      <MobileBottomBar 
        product={product} 
        currentCount={currentCount}
        onJoin={() => document.getElementById('join-form')?.scrollIntoView({behavior:'smooth'})}
      />
    </div>
  );
}
