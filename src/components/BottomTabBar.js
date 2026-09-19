'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/events', icon: '🏠', label: '둘러보기' },
  { href: '/events/new', icon: '➕', label: '공구열기' },
  { href: '/my', icon: '📋', label: '내활동' },
  { href: '/profile', icon: '👤', label: '내정보' },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="bottom-tabbar">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`bottom-tab ${pathname === t.href ? 'active' : ''}`}
        >
          <span className="bottom-tab-icon">{t.icon}</span>
          <span className="bottom-tab-label">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
