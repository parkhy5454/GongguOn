import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/authServer';
import { isAdminEmail } from '@/lib/admin';
import AdminDashboard from '@/components/AdminDashboard';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect('/events');
  }
  return <AdminDashboard />;
}
