import { CANONICAL_FIELDS, type CanonicalField } from '../core/fields';
import { ct } from '../core/i18n';
import { columnReason } from '../core/mapping';
import type { SourceFile } from '../core/types';
import { sessionTitle, useSession } from '../app/session';
import { msgs, tr } from '../i18n/lang';
import { LangToggle, useT } from '../i18n/react';
import { Button, LanternMark, Notice, RanOn } from '../ui/kit';

const M = msgs(
  {
    drillFiles: { census: 'Census at 21:00', v1: 'Version 1, emailed 03:10', v2: 'Version 2, reply-all 07:40' } as Record<string, string>,
    importFiles: { census: 'Census', v1: 'Earlier version', v2: 'Later version' } as Record<string, string>,
    startOver: 'Start over',
    title: 'Check what each column means',
    lede: 'Every ward invents its own columns during an outage. Lantern read the headers and the values, and proposes what each column holds.',
    flagged: (n: number) => ` ${n} ${n === 1 ? 'column needs' : 'columns need'} your eye before comparing.`,
    clean: ' Nothing looked doubtful, but have a glance before comparing.',
    rows: (name: string, n: number) => `${name}, ${n} rows`,
    colFile: 'Column in the file',
    colValues: 'First values',
    colReads: 'Lantern reads it as',
    noHeader: '(no header)',
    empty: '(empty)',
    meaning: (h: string) => `Meaning of column ${h}`,
    confirm: 'Please confirm',
    agree: 'Header and values agree',
    fromHeader: 'Read from the header',
    fromValues: 'Read from the values',
    compare: 'Compare the two versions',
    runs: 'Runs',
    drillCloud: 'where available; this browser will use the cloud for the synthetic drill',
  },
  {
    drillFiles: { census: 'Lista de doentes às 21:00', v1: 'Versão 1, enviada por email às 03:10', v2: 'Versão 2, resposta a todos às 07:40' },
    importFiles: { census: 'Lista de doentes', v1: 'Versão anterior', v2: 'Versão posterior' },
    startOver: 'Recomeçar',
    title: 'Confirme o que quer dizer cada coluna',
    lede: 'Cada enfermaria inventa as suas colunas durante uma falha. O Lantern leu os cabeçalhos e os valores, e propõe o que contém cada coluna.',
    flagged: (n) => ` ${n} ${n === 1 ? 'coluna precisa' : 'colunas precisam'} da sua atenção antes de comparar.`,
    clean: ' Nada pareceu duvidoso, mas dê uma vista de olhos antes de comparar.',
    rows: (name, n) => `${name}, ${n} linhas`,
    colFile: 'Coluna no ficheiro',
    colValues: 'Primeiros valores',
    colReads: 'O Lantern lê como',
    noHeader: '(sem cabeçalho)',
    empty: '(vazia)',
    meaning: (h) => `Significado da coluna ${h}`,
    confirm: 'Confirme, por favor',
    agree: 'O cabeçalho e os valores coincidem',
    fromHeader: 'Lido do cabeçalho',
    fromValues: 'Lido dos valores',
    compare: 'Comparar as duas versões',
    runs: 'Corre',
    drillCloud: 'quando disponível; este navegador vai usar a nuvem para o simulacro fictício',
  },
);

/** The name people know a file by ("Version 1, emailed 03:10"), in the current interface language. */
export function versionName(f: SourceFile, kind: 'drill' | 'import'): string {
  return (kind === 'drill' ? tr(M).drillFiles : tr(M).importFiles)[f.id] ?? f.name;
}

export default function Sources() {
  const s = useSession();
  const t = useT(M);
  const session = s.session!;
  const flagged = session.files.flatMap((f) => f.mapping.filter((c) => c.needsReview)).length;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LanternMark />
          <span className="text-lg font-semibold">Lantern</span>
          <span className="ml-3 text-ink-soft">{sessionTitle(session.kind)}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button tone="quiet" onClick={() => void s.reset()}>
            {t.startOver}
          </Button>
          <LangToggle />
        </div>
      </header>

      <h1 className="text-3xl font-semibold tracking-[-0.01em]">{t.title}</h1>
      <p className="mt-3 max-w-[64ch] text-lg text-ink-soft">
        {t.lede}
        {flagged ? t.flagged(flagged) : t.clean}
      </p>

      <div className="mt-10 space-y-12">
        {session.files.map((f) => (
          <section key={f.id} aria-labelledby={`f-${f.id}`}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
              <h2 id={`f-${f.id}`} className="text-xl font-semibold">
                {versionName(f, session.kind)}
              </h2>
              <span className="text-sm text-ink-faint">{t.rows(f.name, f.rows.length)}</span>
            </div>
            <div className="overflow-x-auto rounded-[3px] border border-rule-strong bg-sheet">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-rule-strong bg-paper text-sm text-ink-soft">
                    <th className="w-[22%] px-3 py-2 font-normal">{t.colFile}</th>
                    <th className="px-3 py-2 font-normal">{t.colValues}</th>
                    <th className="w-[24%] px-3 py-2 font-normal">{t.colReads}</th>
                  </tr>
                </thead>
                <tbody>
                  {f.mapping.map((c) => (
                    <tr key={c.index} className={`border-b border-rule last:border-b-0 ${c.needsReview ? 'bg-pen-wash/60' : ''}`}>
                      <td className="px-3 py-2.5 align-top font-mono text-[15px]">{c.header || <span className="text-ink-faint">{t.noHeader}</span>}</td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {f.rows
                            .slice(0, 3)
                            .map((r) => r[c.index])
                            .filter(Boolean)
                            .map((v, i) => (
                              <span key={i} className="max-w-[26ch] truncate rounded-[2px] border border-rule bg-paper px-1.5 py-0.5 font-mono text-[14px] text-ink-soft">
                                {v}
                              </span>
                            ))}
                          {!f.rows.some((r) => r[c.index]) && <span className="text-ink-faint">{t.empty}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <select
                          aria-label={t.meaning(c.header)}
                          value={c.field}
                          onChange={(e) => s.setField(f.id, c.index, e.target.value as CanonicalField)}
                          className="w-full rounded-md border border-rule-strong bg-sheet px-2 py-1.5 text-[15px]"
                        >
                          {CANONICAL_FIELDS.map((k) => (
                            <option key={k} value={k}>
                              {ct().fieldLabel[k]}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-[13px] text-ink-faint">
                          {c.needsReview ? (
                            <span className="text-pen">{columnReason(c) ?? t.confirm}</span>
                          ) : c.basis === 'agree' ? (
                            t.agree
                          ) : c.basis === 'rule' && columnReason(c) ? (
                            columnReason(c)
                          ) : c.model ? (
                            t.fromHeader
                          ) : (
                            t.fromValues
                          )}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Button onClick={() => void s.compare()} disabled={!!s.busy} className="px-5 py-3 text-base">
          {t.compare}
        </Button>
        <span className="flex items-center gap-2 text-sm text-ink-soft">
          {t.runs} <RanOn source="on_device" /> {session.kind === 'drill' && s.local !== 'available' ? t.drillCloud : ''}
        </span>
      </div>
      {s.error && (
        <div className="mt-4 max-w-[64ch]">
          <Notice tone="pen">{s.error}</Notice>
        </div>
      )}
    </main>
  );
}
