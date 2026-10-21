import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const owner = (r: Request) => r.headers.get('oai-authenticated-user-id');
function sameOrigin(r: Request) { const origin = r.headers.get('origin'); return !origin || origin === new URL(r.url).origin; }
export async function GET(request: Request) {
  const user = owner(request); if (!user) return json({ error: 'Sign in to open your writing workspace.' }, 401);
  if (!env.DB) return json({ error: 'Project storage is unavailable.' }, 503);
  const since=request.headers.get('X-Workspace-Revision');
  if(since!==null&&/^\d+$/.test(since)){
    const [meta]=await env.DB.batch([env.DB.prepare('SELECT revision, updated_at FROM desk_workspaces WHERE owner = ?').bind(user)]);
    const head=meta.results[0] as {revision:number;updated_at:string}|undefined;
    if(Number(since)===(head?.revision||0))return json({revision:head?.revision||0,updatedAt:head?.updated_at,userId:user,unchanged:true});
  }
  const [meta, rows] = await env.DB.batch([
    env.DB.prepare('SELECT revision, updated_at FROM desk_workspaces WHERE owner = ?').bind(user),
    env.DB.prepare('SELECT payload FROM desk_chunks WHERE owner = ? ORDER BY position').bind(user),
  ]);
  const head = meta.results[0] as { revision: number; updated_at: string } | undefined;
  try { const body = rows.results.map(r => String((r as Record<string, unknown>).payload)).join(''); return json({ revision: head?.revision || 0, updatedAt: head?.updated_at, userId: user, state: body ? JSON.parse(body) : null }); }
  catch { return json({ error: 'Stored project could not be read. Restore a downloaded backup.' }, 500); }
}
export async function PUT(request: Request) {
  const user = owner(request); if (!user) return json({ error: 'Sign in to save your writing.' }, 401);
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  if (!env.DB) return json({ error: 'Project storage is unavailable.' }, 503);
  const raw = await request.text();
  if (raw.length > 8_000_000) return json({ error: 'Workspace exceeds 8 MB of text and revisions. Download a backup and remove unused snapshots.' }, 413);
  let data; try { data = JSON.parse(raw); } catch { return json({ error: 'Invalid workspace.' }, 400); }
  if(data.userId&&data.userId!==user)return json({error:'The signed-in account changed. Reopen this app before saving.'},401);
  if (!Number.isInteger(data.revision) || data.revision < 0 || data.state?.version !== 3 || !Array.isArray(data.state.projects) || !Array.isArray(data.state.snapshots)) return json({ error: 'Invalid workspace format.' }, 400);
  const payload = JSON.stringify(data.state), token = crypto.randomUUID(), stamp = new Date().toISOString(), revision = data.revision + 1;
  const statements = [
    env.DB.prepare('INSERT INTO desk_workspaces(owner, revision, write_token, updated_at) VALUES(?, 0, \'\', ?) ON CONFLICT(owner) DO NOTHING').bind(user, stamp),
    env.DB.prepare('UPDATE desk_workspaces SET revision = ?, write_token = ?, updated_at = ? WHERE owner = ? AND revision = ?').bind(revision, token, stamp, user, data.revision),
    env.DB.prepare('DELETE FROM desk_chunks WHERE owner = ? AND EXISTS (SELECT 1 FROM desk_workspaces WHERE owner = ? AND write_token = ?)').bind(user, user, token),
  ];
  let position = 0;
  for (let start = 0; start < payload.length;) { let end = Math.min(start + 120_000, payload.length); const last = payload.charCodeAt(end - 1); if (end < payload.length && last >= 0xd800 && last <= 0xdbff) end--; statements.push(env.DB.prepare('INSERT INTO desk_chunks(owner, position, payload) SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM desk_workspaces WHERE owner = ? AND write_token = ?)').bind(user, position++, payload.slice(start, end), user, token)); start = end; }
  const result = await env.DB.batch(statements);
  if (!result[1].meta.changes) return json({ error: 'This workspace changed in another tab or device. Your local changes are retained.', conflict: true }, 409);
  return json({ revision, updatedAt: stamp });
}
