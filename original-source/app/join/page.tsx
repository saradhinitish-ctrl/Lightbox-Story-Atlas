import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getChatGPTUser, chatGPTSignInPath } from '../chatgpt-auth';
import StudioMark from '@/components/studio-mark';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title:'Create your workspace · Lightbox',robots:{index:false,follow:true}};

export default async function Join() {
  if(await getChatGPTUser()) redirect('/studio');
  return <main className="lightbox-public join-page">
    <a className="public-brand" href="/"><StudioMark/><span>Lightbox</span></a>
    <section className="join-panel">
      <span className="public-eyebrow">YOUR NEXT FILM STARTS HERE</span>
      <h1>Make room<br/>for your story.</h1>
      <p>Create your own workspace for ideas, screenplays, visual references, and scenes.</p>
      <a className="public-primary" href={chatGPTSignInPath('/studio')} target="_top">Continue with ChatGPT <span aria-hidden="true">↗</span></a>
      <p className="join-explainer">Lightbox uses your ChatGPT account to sign you in. If you don’t have one, create one in the sign-in flow. Your Lightbox workspace starts empty and is saved to your account.</p>
      <a className="public-text-link" href="/">Explore Lightbox first <span aria-hidden="true">→</span></a>
    </section>
    <p className="join-footnote">Already use Lightbox? Continue with the same account to open your saved projects.</p>
  </main>;
}
