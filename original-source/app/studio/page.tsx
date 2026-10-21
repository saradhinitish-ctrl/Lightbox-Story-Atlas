import type { Metadata } from 'next';
import { env } from 'cloudflare:workers';
import { requireChatGPTUser } from '../chatgpt-auth';
import Studio from '@/components/writing-studio';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Your workspace · Lightbox',
  robots: { index:false, follow:false },
  alternates: { canonical:'/studio' },
};

export default async function StudioPage() {
  const user = await requireChatGPTUser('/studio');
  return <Studio accountName={user.displayName} accountUserId={user.userId} allowLegacyArchive={!!env.LIGHTBOX_ARCHIVE_OWNER_ID && user.userId===env.LIGHTBOX_ARCHIVE_OWNER_ID}/>;
}
