// Screen time for a scene, read from what is actually written in it.
//
// Dialogue is timed at a speaking pace. Everything else is timed by how much
// room it takes on a Courier page, using the industry rule of thumb that one
// page (54 lines) plays in about a minute. A scene with no pages yet has no
// content to time, so it uses the planned time the writer set on its card, or
// a one-minute placeholder until they do.
import { wrapScript, scriptText, COLUMN_CHARS, SCRIPT_PROFILE, type ScriptBlock } from './screenplay-layout';
import type { DirectorScene } from './director-model';

export const RUNTIME_LINE_SECONDS = 60 / SCRIPT_PROFILE.lines;
export const RUNTIME_WORDS_PER_SECOND = 2.6; // about 155 spoken words a minute
export const RUNTIME_PLACEHOLDER_MINUTES = 1;
const RUNTIME_EIGHTH_LINES = SCRIPT_PROFILE.lines / 8;

export type TimingSource = 'pages' | 'manual' | 'placeholder';
export interface SceneTiming { seconds: number; source: TimingSource; lines: number; eighths: number; dialogue: number; action: number }

const runtimeWordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const runtimeLineCount = (b: ScriptBlock) => wrapScript(scriptText(b), COLUMN_CHARS[b.type]).length;

/** True when the scene has anything written below its heading. */
export function hasPages(blocks: ScriptBlock[]) { return blocks.some(b => b.type !== 'scene' && b.text.trim()); }

export function blockSeconds(b: ScriptBlock): number {
 if (!b.text.trim()) return 0;
 switch (b.type) {
  case 'scene': return 2; // the establishing beat of a new place
  case 'dialogue': return Math.max(.8, runtimeWordCount(b.text) / RUNTIME_WORDS_PER_SECOND) + .3;
  case 'parenthetical': return .8;
  case 'transition': return 1;
  case 'character': return 0; // the cue itself takes no screen time
  default: return (runtimeLineCount(b) + 1) * RUNTIME_LINE_SECONDS; // action and shots: lines on the page
 }
}

export function sceneTiming(scene: Pick<DirectorScene, 'blocks' | 'meta'>): SceneTiming {
 const blocks = scene.blocks.filter(b => b.text.trim());
 if (!hasPages(blocks)) {
  const manual = typeof scene.meta.minutes === 'number' && Number.isFinite(scene.meta.minutes);
  const seconds = (manual ? scene.meta.minutes! : RUNTIME_PLACEHOLDER_MINUTES) * 60;
  return { seconds, source: manual ? 'manual' : 'placeholder', lines: 0, eighths: 0, dialogue: 0, action: 0 };
 }
 let lines = 0, dialogue = 0, action = 0;
 for (const b of blocks) {
  lines += runtimeLineCount(b) + (b.type === 'dialogue' || b.type === 'parenthetical' ? 0 : 1);
  const s = blockSeconds(b);
  if (b.type === 'dialogue' || b.type === 'parenthetical') dialogue += s; else action += s;
 }
 return { seconds: dialogue + action, source: 'pages', lines, eighths: Math.max(1, Math.round(lines / RUNTIME_EIGHTH_LINES)), dialogue, action };
}

export interface FilmTiming { seconds: number; written: number; planned: number; placeholders: number; manual: number; scenes: SceneTiming[] }
export function filmTiming(scenes: Pick<DirectorScene, 'blocks' | 'meta'>[]): FilmTiming {
 const timings = scenes.map(sceneTiming);
 const sum = (pick: (t: SceneTiming) => boolean) => timings.filter(pick).reduce((a, t) => a + t.seconds, 0);
 return { seconds: sum(() => true), written: sum(t => t.source === 'pages'), planned: sum(t => t.source !== 'pages'), placeholders: timings.filter(t => t.source === 'placeholder').length, manual: timings.filter(t => t.source === 'manual').length, scenes: timings };
}

/** "8 s", "1 min 05 s", "2 min", "1 h 32 min". Seconds are always shown under a minute. */
export function formatDuration(seconds: number) {
 const s = Math.max(0, Math.round(seconds));
 if (s < 60) return s + ' s';
 const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60;
 if (h) return h + ' h ' + String(m).padStart(2, '0') + ' min';
 return r ? m + ' min ' + String(r).padStart(2, '0') + ' s' : m + ' min';
}
/** Timecode: "0:08", "12:40", "1:32:05". */
export function formatTimecode(seconds: number) {
 const s = Math.max(0, Math.round(seconds)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = String(s % 60).padStart(2, '0');
 return h ? h + ':' + String(m).padStart(2, '0') + ':' + r : m + ':' + r;
}
/** Page length the way a breakdown sheet writes it: "3/8", "1 2/8". */
export function formatEighths(eighths: number) {
 const whole = Math.floor(eighths / 8), part = eighths % 8;
 return [whole ? String(whole) : '', part ? part + '/8' : ''].filter(Boolean).join(' ') || '0';
}
/** Reads "1:30", "90s", "90 sec", "1m 30s", "2 min" or a bare number of minutes. Returns minutes. */
export function parseDuration(value: string): number | null {
 const t = value.trim().toLowerCase();
 if (!t) return null;
 let m = t.match(/^(\d+):([0-5]?\d)$/);
 if (m) return (Number(m[1]) * 60 + Number(m[2])) / 60;
 if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
 m = t.match(/^(?:(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?)?\s*(?:(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?)?$/);
 if (m && (m[1] || m[2])) return (Number(m[1] || 0) * 60 + Number(m[2] || 0)) / 60;
 return null;
}
