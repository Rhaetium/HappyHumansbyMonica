'use client';

import { useCallback, useEffect, useState } from 'react';

type Status = { available: boolean; forcedOff: boolean; enabled: boolean; unreadable: boolean; recoveryLeft: number };

const card: React.CSSProperties = { background: 'white', border: '1.5px solid #e8e3dc', borderRadius: '1rem', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' };
const btn: React.CSSProperties = { background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.6rem', padding: '.55rem 1.1rem', fontWeight: 600, cursor: 'pointer' };
const input: React.CSSProperties = { padding: '.6rem .8rem', border: '1.5px solid #e0dbd5', borderRadius: '.5rem', fontSize: '1rem', width: '100%', maxWidth: 260, boxSizing: 'border-box' };

/** Double authentification : activer, voir l'état, désactiver. Le code à 6 chiffres vient d'une application sur le téléphone de Monica. */
export default function TwoFactorCard({ handleUnauthorized }: { handleUnauthorized: (res: Response) => boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [step, setStep] = useState<'idle' | 'setup' | 'codes' | 'disable'>('idle');
  const [setup, setSetup] = useState<{ key: string; uri: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [recovery, setRecovery] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/cms/two-factor', { cache: 'no-store' }).catch(() => null);
    if (!res || handleUnauthorized(res)) return;
    if (res.ok) setStatus(await res.json());
  }, [handleUnauthorized]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- état chargé depuis l'API
  useEffect(() => { load(); }, [load]);

  const call = async (body: Record<string, unknown>) => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/cms/two-factor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (handleUnauthorized(res)) return null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Action impossible.'); return null; }
      return data;
    } catch { setError('Erreur de connexion : réessayez.'); return null; }
    finally { setBusy(false); }
  };

  const start = async () => { const d = await call({ action: 'start' }); if (d) { setSetup(d); setCode(''); setStep('setup'); } };
  const confirm = async () => {
    const d = await call({ action: 'confirm', code });
    if (d?.recoveryCodes) { setRecovery(d.recoveryCodes); setSaved(false); setStep('codes'); setSetup(null); await load(); }
  };
  const disable = async () => {
    const d = await call({ action: 'disable', password, code });
    if (d) { setStep('idle'); setCode(''); setPassword(''); await load(); }
  };

  if (!status) return null;
  return (
    <div style={card}>
      <h2 style={{ margin: '0 0 .35rem', fontSize: '1.05rem' }}>🔐 Double authentification</h2>

      {status.forcedOff && <p style={{ margin: '0 0 .6rem', color: '#b54708', fontSize: '.85rem' }}>⚠️ Désactivée par la variable <code>CMS_2FA_DISABLE</code> dans Vercel. Retirez-la pour la réactiver.</p>}
      {status.unreadable && <p role="alert" style={{ margin: '0 0 .6rem', color: '#b42318', fontSize: '.85rem' }}>État illisible (le secret de chiffrement a peut-être changé). La connexion est bloquée par prudence : voir l’aide de secours ci-dessous.</p>}

      {step === 'idle' && !status.enabled && (
        <>
          <p style={{ margin: '0 0 .8rem', color: '#6b665f', fontSize: '.9rem', lineHeight: 1.5 }}>
            Ajoute un code à 6 chiffres, changé toutes les 30 secondes, à la connexion au CMS. Même si quelqu’un connaît le mot de passe, il ne peut pas entrer sans votre téléphone.
          </p>
          {status.available
            ? <button style={btn} onClick={start} disabled={busy}>Activer</button>
            : <p style={{ margin: 0, color: '#b42318', fontSize: '.85rem' }}>Indisponible : la variable <code>CMS_SESSION_SECRET</code> manque dans Vercel.</p>}
        </>
      )}

      {step === 'idle' && status.enabled && (
        <>
          <p style={{ margin: '0 0 .4rem', fontSize: '.9rem' }}>✅ Activée. Codes de secours restants : <strong>{status.recoveryLeft}</strong>.</p>
          {status.recoveryLeft <= 2 && <p style={{ margin: '0 0 .6rem', color: '#b54708', fontSize: '.85rem' }}>Il en reste peu : désactivez puis réactivez pour en obtenir de nouveaux.</p>}
          <button style={{ ...btn, background: 'white', color: '#b42318', border: '1.5px solid #b42318' }} onClick={() => { setStep('disable'); setError(''); setCode(''); setPassword(''); }}>Désactiver</button>
        </>
      )}

      {step === 'setup' && setup && (
        <div style={{ display: 'grid', gap: '.7rem', fontSize: '.9rem' }}>
          <p style={{ margin: 0 }}><strong>1.</strong> Installez une application d’authentification sur votre téléphone (Google Authenticator, Microsoft Authenticator, Authy, 1Password…).</p>
          <p style={{ margin: 0 }}><strong>2.</strong> Dans l’application : « Ajouter un compte » puis « Saisir une clé de configuration », et tapez cette clé :</p>
          <code style={{ display: 'block', padding: '.7rem', background: '#faf9f7', border: '1px dashed #c9c2b8', borderRadius: '.5rem', fontSize: '1.05rem', letterSpacing: '.08em', wordBreak: 'break-all', userSelect: 'all' }}>{setup.key}</code>
          <p style={{ margin: 0, color: '#8a847b', fontSize: '.8rem' }}>Type de clé : basée sur l’heure. Sur le téléphone, vous pouvez aussi ouvrir ce lien : <a href={setup.uri} style={{ color: '#2d5f54' }}>ajouter automatiquement</a>.</p>
          <p style={{ margin: 0 }}><strong>3.</strong> Tapez ici le code à 6 chiffres affiché :</p>
          <input style={input} inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirm()} placeholder="123456" aria-label="Code à 6 chiffres" />
          {error && <p role="alert" style={{ margin: 0, color: '#b42318' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '.6rem' }}>
            <button style={btn} onClick={confirm} disabled={busy || code.replace(/\s/g, '').length < 6}>Vérifier et activer</button>
            <button style={{ ...btn, background: 'white', color: '#4a4640', border: '1.5px solid #e0dbd5' }} onClick={() => { setStep('idle'); setSetup(null); setError(''); }}>Annuler</button>
          </div>
        </div>
      )}

      {step === 'codes' && (
        <div style={{ display: 'grid', gap: '.7rem', fontSize: '.9rem' }}>
          <p style={{ margin: 0 }}>✅ Double authentification activée. <strong>Notez ces 8 codes de secours</strong> (papier, gestionnaire de mots de passe) : ils ne seront plus jamais affichés. Chacun sert une seule fois si vous perdez votre téléphone.</p>
          <pre style={{ margin: 0, padding: '.8rem', background: '#faf9f7', border: '1px solid #e8e3dc', borderRadius: '.5rem', fontSize: '1rem', lineHeight: 1.7, userSelect: 'all' }}>{recovery.join('\n')}</pre>
          <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} /> J’ai noté ces codes en lieu sûr
          </label>
          <div><button style={{ ...btn, opacity: saved ? 1 : .5 }} disabled={!saved} onClick={() => { setStep('idle'); setRecovery([]); }}>Terminer</button></div>
        </div>
      )}

      {step === 'disable' && (
        <div style={{ display: 'grid', gap: '.7rem', fontSize: '.9rem' }}>
          <p style={{ margin: 0 }}>Pour désactiver, confirmez avec le mot de passe et un code (de l’application ou de secours) :</p>
          <input style={input} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" aria-label="Mot de passe" />
          <input style={input} autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} placeholder="Code" aria-label="Code" />
          {error && <p role="alert" style={{ margin: 0, color: '#b42318' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '.6rem' }}>
            <button style={{ ...btn, background: '#b42318' }} onClick={disable} disabled={busy || !password || !code}>Désactiver</button>
            <button style={{ ...btn, background: 'white', color: '#4a4640', border: '1.5px solid #e0dbd5' }} onClick={() => setStep('idle')}>Annuler</button>
          </div>
        </div>
      )}

      <details style={{ marginTop: '.9rem', fontSize: '.8rem', color: '#6b665f' }}>
        <summary style={{ cursor: 'pointer' }}>Téléphone et codes de secours perdus ?</summary>
        <p style={{ margin: '.5rem 0 0', lineHeight: 1.5 }}>
          Dans Vercel (Settings, Environment Variables), ajoutez <code>CMS_2FA_DISABLE</code> = <code>1</code>, puis « Redeploy ». La double authentification est coupée, vous vous connectez avec le mot de passe seul, puis vous la réactivez et retirez la variable.
        </p>
      </details>
    </div>
  );
}
