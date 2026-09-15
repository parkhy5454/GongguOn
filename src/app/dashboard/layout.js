import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/authServer';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="shell">
      <Sidebar user={{ id: user.id, name: user.name, email: user.email }} />
      <div className="main">{children}</div>
    </div>
  );
}
