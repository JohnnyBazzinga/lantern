import { FileSpreadsheet } from 'lucide-react';
import { CANONICAL_FIELDS, type CanonicalField } from '../core/fields';
import { ct } from '../core/i18n';
import { columnReason, type FinalColumn } from '../core/mapping';
import { cellRef } from '../core/parse';
import type { SourceFile } from '../core/types';
import { sessionTitle, useSession } from '../app/session';
import { msgs, tr } from '../i18n/lang';
import { useT } from '../i18n/react';
import { AppBar, Button, Notice, Route, StateGlyph, Steps, usePageTitle } from '../ui/kit';
import { Tally } from '../ui/Tally';

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
    colHow: 'How Lantern decided',
    needsLook: 'needs your eye',
    pageTitle: 'Columns',
    stillFlagged: (n: number) => `${n} ${n === 1 ? 'column is' : 'columns are'} highlighted above.`,
    allChecked: 'All columns read.',
    compare: 'Compare the two versions',
    runs: 'The comparison runs',
    drillCloud: 'This browser has no on-device AI, so the fictional drill is compared in the cloud.',
    rulesOnly: "No on-device AI on this PC: Lantern's rules compare the rows, nothing is sent, and you decide the rest.",
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
    colHow: 'Como o Lantern decidiu',
    needsLook: 'precisa da sua atenção',
    pageTitle: 'Colunas',
    stillFlagged: (n) => `${n} ${n === 1 ? 'coluna está assinalada' : 'colunas estão assinaladas'} acima.`,
    allChecked: 'Todas as colunas foram lidas.',
    compare: 'Comparar as duas versões',
    runs: 'A comparação corre',
    drillCloud: 'Este navegador não tem IA local, por isso o simulacro fictício é comparado na nuvem.',
    rulesOnly: 'Sem IA local neste computador: as regras do Lantern comparam as linhas, nada é enviado, e o resto fica para decidir na revisão.',
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
  usePageTitle(t.pageTitle);
  const flagged = session.files.flatMap((f) => f.mapping.filter((c) => c.needsReview)).length;
  // say where the comparison will really run on this PC, not where it was meant to
  const runsOn =
    s.local === 'available' ? (
      <>
        {t.runs} <Route source="on_device" />
      </>
    ) : session.kind === 'drill' ? (
      <>
        <Route source="in_cloud" /> {t.drillCloud}
      </>
    ) : (
      <>
        <Route source="rule" /> {t.rulesOnly}
      </>
    );

  return (
    <div className="flex min-h-full flex-col">
      <AppBar title={sessionTitle(session.kind)} steps={<Steps current="columns" />}>
        <Tally kind={session.kind} />
      </AppBar>
      <main className="@container mx-auto w-full max-w-[1360px] flex-1 px-4 pt-7 sm:px-8 sm:pt-10">
        <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.01em] text-night sm:text-[44px]">{t.title}</h1>
        <p className="mt-3 max-w-[70ch] text-[19px] leading-[1.5] text-ink-soft">
          {t.lede}
          {flagged ? <strong className="font-semibold text-pen">{t.flagged(flagged)}</strong> : t.clean}
        </p>

        <div className="mt-8 space-y-9">
          {session.files.map((f) => (
            <FileSheet key={f.id} file={f} />
          ))}
        </div>

        {/* the action stays in view: the sheets are long and the button used to sit far below the fold */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-9 border-t border-rule-strong bg-paper px-4 py-3 sm:-mx-8 sm:px-8 sm:py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 lg:flex-nowrap">
            <Button size="lg" onClick={() => void s.compare()} disabled={!!s.busy} className="w-full shrink-0 whitespace-nowrap sm:w-auto">
              {t.compare}
            </Button>
            <span className={`flex shrink-0 items-center gap-2 text-[16px] ${flagged ? 'text-pen' : ''}`}>
              <StateGlyph state={flagged ? 'waiting' : 'done'} />
              {flagged ? t.stillFlagged(flagged) : t.allChecked}
            </span>
            {/* on a phone the bar keeps to the button and the count; where it runs is said below */}
            <span className="hidden min-w-0 max-w-[64ch] items-center gap-2 text-[15px] leading-snug text-ink-soft lg:flex">{runsOn}</span>
            <span className="ml-auto hidden shrink-0 sm:block">
              <Button tone="quiet" onClick={() => void s.reset()}>
                {t.startOver}
              </Button>
            </span>
          </div>
          {s.error && (
            <div className="mt-3 max-w-[70ch]">
              <Notice tone="pen">{s.error}</Notice>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6 pt-3 text-[15px] text-ink-soft lg:hidden">
          <p className="flex flex-wrap items-center gap-2">{runsOn}</p>
          <span className="sm:hidden">
            <Button tone="quiet" onClick={() => void s.reset()}>
              {t.startOver}
            </Button>
          </span>
        </div>
      </main>
    </div>
  );
}

/** How Lantern settled on a column's meaning, in words; a glyph only where it says something a glance can use. */
function Decided({ c }: { c: FinalColumn }) {
  const t = useT(M);
  if (c.needsReview)
    return (
      <span className="flex items-start gap-2 text-pen">
        <span className="mt-[3px]">
          <StateGlyph state="waiting" label={t.needsLook} />
        </span>
        <span>{columnReason(c) ?? t.confirm}</span>
      </span>
    );
  if (c.basis === 'agree')
    return (
      <span className="flex items-start gap-2">
        <span className="mt-[3px]">
          <StateGlyph state="done" />
        </span>
        <span>{t.agree}</span>
      </span>
    );
  // one of the two was clear, or a rule decided: plain words, no mark
  return <span className="block pl-[26px] text-ink-soft">{c.basis === 'rule' && columnReason(c) ? columnReason(c) : c.model ? t.fromHeader : t.fromValues}</span>;
}

/**
 * One file as a strip of its own sheet: each of its columns with its letter, its header and its first
 * values exactly as typed, then what Lantern reads it as and how it decided. On a narrow pane each
 * column becomes a block, so the choice never scrolls out of reach.
 */
function FileSheet({ file: f }: { file: SourceFile }) {
  const s = useSession();
  const t = useT(M);
  const session = s.session!;
  const letter = (c: FinalColumn) => cellRef(0, c.index).replace(/\d+$/, '');
  const values = (c: FinalColumn) => {
    const seen = f.rows
      .slice(0, 3)
      .map((r) => r[c.index])
      .filter(Boolean);
    return seen.length ? (
      <span className="flex flex-wrap gap-1.5">
        {seen.map((v, i) => (
          <span key={i} className="max-w-[26ch] truncate border border-rule bg-paper px-1.5 py-0.5 font-mono text-[15px] tracking-[-0.015em]">
            {v}
          </span>
        ))}
      </span>
    ) : (
      <span className="text-ink-faint">{t.empty}</span>
    );
  };
  const header = (c: FinalColumn) => (c.header ? <span className="font-mono text-[16px] tracking-[-0.015em]">{c.header}</span> : <span className="text-ink-faint">{t.noHeader}</span>);
  const choice = (c: FinalColumn) => (
    <select
      aria-label={t.meaning(c.header)}
      value={c.field}
      onChange={(e) => s.setField(f.id, c.index, e.target.value as CanonicalField)}
      className={`min-h-[42px] w-full rounded-md border bg-sheet px-2.5 py-1.5 text-[16px] ${c.needsReview ? 'border-pen' : 'border-rule-strong'}`}
    >
      {CANONICAL_FIELDS.map((k) => (
        <option key={k} value={k}>
          {ct().fieldLabel[k]}
        </option>
      ))}
    </select>
  );
  return (
    <section aria-labelledby={`f-${f.id}`}>
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
        <h2 id={`f-${f.id}`} className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.01em] text-night">
          <FileSpreadsheet size={22} className="shrink-0 text-ink-soft" aria-hidden />
          {versionName(f, session.kind)}
        </h2>
        <span className="text-[15px] text-ink-soft">{t.rows(f.name, f.rows.length)}</span>
      </div>

      <table className="hidden w-full table-fixed border-collapse border border-rule-strong bg-sheet text-left @3xl:table">
        <colgroup>
          <col style={{ width: '3rem' }} />
          <col style={{ width: '19%' }} />
          <col />
          <col style={{ width: '15.5rem' }} />
          <col style={{ width: '27%' }} />
        </colgroup>
        <thead>
          <tr className="border-b border-rule-strong bg-gutter text-[14px] text-ink-soft">
            <th scope="col" className="px-3 py-2 font-normal" />
            <th scope="col" className="border-l border-rule px-3 py-2 font-normal">
              {t.colFile}
            </th>
            <th scope="col" className="border-l border-rule px-3 py-2 font-normal">
              {t.colValues}
            </th>
            <th scope="col" className="border-l border-rule px-3 py-2 font-normal">
              {t.colReads}
            </th>
            <th scope="col" className="border-l border-rule px-3 py-2 font-normal">
              {t.colHow}
            </th>
          </tr>
        </thead>
        <tbody>
          {f.mapping.map((c) => (
            <tr key={c.index} className={`border-b border-rule last:border-b-0 ${c.needsReview ? 'bg-pen-wash/50' : ''}`}>
              <th scope="row" className="border-r border-rule-strong bg-gutter px-3 py-2.5 text-center align-middle text-[14px] font-normal tabular-nums text-ink-soft">
                {letter(c)}
              </th>
              <td className="px-3 py-2.5 align-middle">{header(c)}</td>
              <td className="border-l border-rule px-3 py-2.5 align-middle">{values(c)}</td>
              <td className="border-l border-rule px-3 py-2 align-middle">{choice(c)}</td>
              <td className="border-l border-rule px-3 py-2.5 align-middle text-[15px] leading-snug">
                <Decided c={c} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="border border-rule-strong bg-sheet @3xl:hidden">
        {f.mapping.map((c) => (
          <li key={c.index} className={`border-b border-rule last:border-b-0 ${c.needsReview ? 'bg-pen-wash/50' : ''}`}>
            <p className="flex items-center gap-3 border-b border-rule bg-gutter/60 px-3 py-1.5">
              <span className="w-5 text-center text-[14px] tabular-nums text-ink-soft">{letter(c)}</span>
              {header(c)}
            </p>
            <div className="space-y-2.5 px-3 py-2.5">
              {values(c)}
              {choice(c)}
              <p className="text-[15px] leading-snug">
                <Decided c={c} />
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
