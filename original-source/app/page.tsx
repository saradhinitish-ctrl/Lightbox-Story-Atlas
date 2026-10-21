import { redirect } from 'next/navigation';
import { getChatGPTUser } from './chatgpt-auth';
import PublicHome from '@/components/public-home';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getChatGPTUser();
  if (user) redirect('/studio');
  return <PublicHome/>;
}
