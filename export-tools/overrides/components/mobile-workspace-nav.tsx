'use client';
import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, Lightbulb, Film, Palette, Rows3, Columns2, X, Check } from 'lucide-react';
const destinations = [
  { id: 'atlas', label: 'Atlas', detail: 'Your story at a glance', Icon: LayoutGrid },
  { id: 'develop', label: 'Develop', detail: 'Ideas & foundation', Icon: Lightbulb },
  { id: 'write', label: 'Write', detail: 'Your screenplay', Icon: Film },
  { id: 'visuals', label: 'Visuals', detail: 'Boards & references', Icon: Palette },
  { id: 'sequence', label: 'Sequence', detail: 'Beats & story rhythm', Icon: Rows3 },
  { id: 'breakdown', label: 'Breakdown', detail: 'Page, frame & assets', Icon: Columns2 },
] as const;
export type MobileDestination = typeof destinations[number]['id'];
export default function MobileWorkspaceNav({ current, onNavigate }: { current: MobileDestination | ''; onNavigate: (id: MobileDestination) => void }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const active = destinations.find(item => item.id === current);
  useEffect(() => {
    const element = dialog.current;
    if (open) {
      element?.showModal();
      element?.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus();
    } else if (element?.open) {
      element.close();
      trigger.current?.focus({ preventScroll: true });
    }
    return () => { if (element?.open) element.close(); };
  }, [open]);
  function close() { setOpen(false); trigger.current?.focus({ preventScroll: true }); }
  return <div className="mobile-workspace-switcher">
    <button ref={trigger} type="button" className="workspace-launcher" aria-label="Open workspace navigation" aria-haspopup="dialog" aria-expanded={open} aria-controls="mobile-workspace-dialog" onClick={() => setOpen(true)}>
      <LayoutGrid size={18}/><span>Workspace</span><span className="workspace-current">{active?.label || 'Library'}</span>
    </button>
    <dialog ref={dialog} id="mobile-workspace-dialog" className="workspace-sheet" aria-labelledby="workspace-sheet-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <header><div><span className="workspace-sheet-eyebrow">MOVE THROUGH YOUR STORY</span><h2 id="workspace-sheet-title">Your workspace</h2></div><button type="button" aria-label="Close workspace navigation" onClick={close}><X size={20}/></button></header>
      <nav aria-label="Creative workspace modes">{destinations.map(({ id, label, detail, Icon }) => <button key={id} type="button" aria-current={current === id ? 'page' : undefined} onClick={() => { close(); onNavigate(id); }}><span className="workspace-destination-icon"><Icon size={21}/></span><strong>{label}</strong><small>{detail}</small>{current === id && <Check size={14} className="workspace-selected"/>}</button>)}</nav>
    </dialog>
  </div>;
}
