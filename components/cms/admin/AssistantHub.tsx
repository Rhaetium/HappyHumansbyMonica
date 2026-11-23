'use client';

import { useState } from 'react';
import AssistantTab from '@/components/cms/admin/AssistantTab';
import PageBuilderPanel from '@/components/cms/admin/PageBuilderPanel';
import type { AssistantChange } from '@/lib/assistant';

type Props = {
  applyChanges: (changes: AssistantChange[]) => Promise<boolean>;
  handleTabChange: (tab: string) => void;
  handleUnauthorized: (res: Response) => boolean;
};

/** Onglet « 💬 Assistant » : deux façons de demander à l'IA, modifier des textes existants ou créer une page entière. */
export default function AssistantHub(props: Props) {
  const [mode, setMode] = useState<'texts' | 'page'>('texts');
  const tab = (active: boolean): React.CSSProperties => ({
    padding: '.5rem 1rem', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: '.88rem',
    border: '1.5px solid #2d5f54', background: active ? '#2d5f54' : 'white', color: active ? 'white' : '#2d5f54',
  });
  return (
    <div style={{ maxWidth: 860 }}>
      <div role="tablist" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button role="tab" aria-selected={mode === 'texts'} style={tab(mode === 'texts')} onClick={() => setMode('texts')}>✏️ Modifier des textes</button>
        <button role="tab" aria-selected={mode === 'page'} style={tab(mode === 'page')} onClick={() => setMode('page')}>🧱 Créer une page</button>
      </div>
      {mode === 'texts'
        ? <AssistantTab {...props} />
        : <PageBuilderPanel handleTabChange={props.handleTabChange} handleUnauthorized={props.handleUnauthorized} />}
    </div>
  );
}
