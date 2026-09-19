'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import InviteButton from './InviteButton';
import NotificationBell from './NotificationBell';

export default function TopNav({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="topnav">
      <Link href="/events" className="brand">공구온</Link>
      <nav>
        <Link href="/events" className={pathname === '/events' ? 'active' : ''}>공구 둘러보기</Link>
        <Link href="/events/new" className={pathname === '/events/new' ? 'active' : ''}>공구 열기</Link>
        <Link href="/my" className={pathname === '/my' ? 'active' : ''}>내 활동</Link>
        {user.isAdmin && (
          <Link href="/admin" className={pathname === '/admin' ? 'active' : ''}>🛠 관리자</Link>
        )}
      </nav>
      <div className="spacer" />
      <NotificationBell />
      <InviteButton referralCode={user.referralCode} />
      <div className="user-chip">
        <Link href="/profile" style={{ color: 'inherit' }}>
          {user.name}
          {user.rating ? ` · ⭐ ${user.rating.toFixed(1)}` : ''}
          {typeof user.pointBalance === 'number' ? ` · 💰 ${user.pointBalance.toLocaleString()}P` : ''}
        </Link>
        <button className="btn btn-ghost btn-sm" onClick={logout}>로그아웃</button>
      </div>
    </div>
  );
}
