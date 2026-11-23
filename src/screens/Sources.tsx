import { ChevronDown, FileText, Info, Play, RotateCcw } from 'lucide-react';
import { CANONICAL_FIELDS, type CanonicalField } from '../core/fields';
import { ct } from '../core/i18n';
import { columnReason, type FinalColumn } from '../core/mapping';
import { cellRef } from '../core/parse';
import type { SourceFile } from '../core/types';
import { sessionTitle, useSession } from '../app/session';
import { msgs, tr } from '../i18n/lang';
import { useT } from '../i18n/react';
import { Backdrop } from '../ui/Backdrop';
import { AppBar, Button, Card, Caution, Eyebrow, Kicker, Marked, Notice, Route, StateGlyph, Steps, Tick, usePageTitle } from '../ui/kit';
import { Tally } from '../ui/Tally';

const M = msgs(
  {
    drillFiles: { census: 'Census at 21:00', v1: 'Version 1, emailed 03:10', v2: 'Version 2, reply-all 07:40' } as Record<string, string>,
    importFiles: { census: 'Census', v1: 'Earlier version', v2: 'Later version' } as Record<string, string>,
    startOver: 'Start over',
    title: ['Check what', 'each column means.'],
    stepOf: 'Step 1 of 3',
    kicker: 'Check before comparing',
    howNote: 'Next to each choice, Lantern says how it decided: “Header and values agree”, “Read from the header” or “Read from the values”. Anything in amber is worth a look.',
    runsHere: 'The comparison runs here, with Gemini Nano.',
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
    title: ['Confirme o que quer dizer', 'cada coluna.'],
    stepOf: 'Passo 1 de 3',
    kicker: 'Revisão antes da comparação',
    howNote: 'Ao lado de cada escolha, o Lantern diz como decidiu: “O cabeçalho e os valores coincidem”, “Lido do cabeçalho” ou “Lido dos valores”. O que estiver a âmbar merece uma vista de olhos.',
    runsHere: 'A comparação corre aqui, com o Gemini Nano.',
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
        <Route source="on_device" /> <span>{t.runsHere}</span>
      </>
    ) : session.kind === 'drill' ? (
      <>
        <Route source="in_cloud" /> <span>{t.drillCloud}</span>
      </>
    ) : (
      <>
        <Route source="rule" /> <span>{t.rulesOnly}</span>
      </>
    );
  const startOver = (
    <Button tone="quiet" onClick={() => void s.reset()} className="!px-2 text-ink no-underline hover:no-underline">
      <RotateCcw size={18} strokeWidth={2} aria-hidden /> <span className="max-sm:sr-only">{t.startOver}</span>
    </Button>
  );

  return (
    <div className="relative isolate flex min-h-full flex-col">
      <Backdrop variant="page" />
      <AppBar title={sessionTitle(session.kind)} steps={<Steps current="columns" />} actions={startOver} onWave>
        <Tally kind={session.kind} />
      </AppBar>
      <main className="@container mx-auto w-full max-w-[1480px] flex-1 px-4 pt-6 sm:px-8 sm:pt-8 xl:px-12">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Eyebrow>{t.stepOf}</Eyebrow>
          <Kicker>{t.kicker}</Kicker>
        </div>
        <h1 className="mt-5 max-w-[22ch] font-display text-[40px] font-medium leading-[1.04] tracking-[-0.022em] text-ink sm:text-[54px] xl:max-w-none xl:text-[64px]">
          {t.title[0]} <Marked>{t.title[1]}</Marked>
        </h1>
        <p className="mt-4 max-w-[80ch] text-[18px] leading-[1.5] text-ink">
          {t.lede}
          {flagged ? <strong className="font-semibold text-amber-ink">{t.flagged(flagged)}</strong> : t.clean}
        </p>
        <p className="mt-3 flex max-w-[96ch] items-start gap-3 text-[14.5px] leading-snug text-ink-soft">
          <Info size={20} strokeWidth={1.8} className="mt-px shrink-0 text-moss" aria-hidden />
          {t.howNote}
        </p>

        <div className="mt-8 space-y-6">
          {session.files.map((f) => (
            <FileSheet key={f.id} file={f} />
          ))}
        </div>

        {/* the action stays in view: the sheets are long and the button used to sit far below the fold */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-6 bg-paper/95 px-4 py-4 shadow-[0_-1px_0_var(--color-rule)] backdrop-blur-[2px] sm:-mx-8 sm:px-8 xl:-mx-12 xl:px-12">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:flex-nowrap">
            <Button size="lg" onClick={() => void s.compare()} disabled={!!s.busy} className="w-full shrink-0 whitespace-nowrap sm:w-auto">
              <Play size={18} fill="currentColor" strokeWidth={0} aria-hidden /> {t.compare}
            </Button>
            <span className="hidden h-9 w-px bg-rule-strong sm:block" aria-hidden />
            <span className={`flex shrink-0 items-center gap-2.5 text-[16px] font-semibold ${flagged ? 'text-amber-ink' : ''}`}>
              {flagged ? <StateGlyph state="waiting" /> : <Tick size={22} />}
              {flagged ? t.stillFlagged(flagged) : t.allChecked}
            </span>
            {/* on a phone the bar keeps to the button and the count; where it runs is said below */}
            <span className="hidden min-w-0 max-w-[64ch] items-center gap-3 text-[15px] leading-snug text-ink-soft lg:flex">{runsOn}</span>
          </div>
          {s.error && (
            <div role="alert" className="mt-3 max-w-[70ch]">
              <Notice tone="alarm">{s.error}</Notice>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 pb-6 pt-3 text-[15px] text-ink-soft lg:hidden">{runsOn}</div>
      </main>
    </div>
  );
}

/** How Lantern settled on a column's meaning, in words; a glyph only where it says something a glance can use. */
function Decided({ c }: { c: FinalColumn }) {
  const t = useT(M);
  if (c.basis === 'agree' && !c.needsReview)
    return (
      <span className="flex items-center gap-2.5">
        <Tick size={20} />
        <span>{t.agree}</span>
      </span>
    );
  // read from one side only, or a rule decided: amber, worth a look; flagged ones say why
  return (
    <span className={`flex items-start gap-2.5 ${c.needsReview ? 'text-amber-ink' : ''}`}>
      <Caution size={20} className="mt-px" />
      <span>
        {c.needsReview ? (columnReason(c) ?? t.confirm) : c.basis === 'rule' && columnReason(c) ? columnReason(c) : c.model ? t.fromHeader : t.fromValues}
        {c.needsReview && <span className="sr-only"> ({t.needsLook})</span>}
      </span>
    </span>
  );
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
          <span key={i} className="max-w-[26ch] truncate rounded-md bg-well px-2 py-0.5 font-mono text-[14.5px] tracking-[-0.01em]">
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
    <span className="relative block">
      <select
        aria-label={t.meaning(c.header)}
        value={c.field}
        onChange={(e) => s.setField(f.id, c.index, e.target.value as CanonicalField)}
        className={`min-h-[40px] w-full appearance-none rounded-lg border py-1.5 pl-4 pr-10 text-[16px] ${
          c.basis === 'agree' && !c.needsReview ? 'border-rule-strong bg-sheet' : 'border-amber-line bg-amber-wash'
        }`}
      >
        {CANONICAL_FIELDS.map((k) => (
          <option key={k} value={k}>
            {ct().fieldLabel[k]}
          </option>
        ))}
      </select>
      <ChevronDown size={18} strokeWidth={2} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink" aria-hidden />
    </span>
  );
  const th = 'px-4 py-2.5 font-semibold';
  return (
    <Card as="section" aria-labelledby={`f-${f.id}`}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-4 sm:px-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-forest" aria-hidden>
          <FileText size={20} strokeWidth={1.9} />
        </span>
        <h2 id={`f-${f.id}`} className="font-display text-[24px] font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-[27px]">
          {versionName(f, session.kind)}
        </h2>
        <span className="hidden h-7 w-px bg-rule-strong sm:block" aria-hidden />
        <span className="text-[15px] text-ink-soft">{t.rows(f.name, f.rows.length)}</span>
      </div>

      <div className="hidden px-4 pb-3 @3xl:block">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left">
          <colgroup>
            <col style={{ width: '3rem' }} />
            <col style={{ width: '20%' }} />
            <col />
            <col style={{ width: '17rem' }} />
            <col style={{ width: '25%' }} />
          </colgroup>
          <thead>
            <tr className="text-[14px] text-ink">
              <th scope="col" className="rounded-l-lg bg-well px-3 py-2.5">
                <span className="sr-only">{t.colFile}</span>
              </th>
              <th scope="col" className={`bg-well ${th}`}>
                {t.colFile}
              </th>
              <th scope="col" className={`bg-well ${th}`}>
                {t.colValues}
              </th>
              <th scope="col" className={`bg-well ${th}`}>
                {t.colReads}
              </th>
              <th scope="col" className={`rounded-r-lg bg-well ${th}`}>
                <span className="sr-only">{t.colHow}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {f.mapping.map((c, i) => {
              const line = i < f.mapping.length - 1 ? 'border-b border-rule' : '';
              return (
                <tr key={c.index}>
                  <th scope="row" className={`px-3 py-2.5 text-center align-middle text-[13.5px] font-normal tabular-nums text-ink-faint ${line}`}>
                    {letter(c)}
                  </th>
                  <td className={`px-4 py-2.5 align-middle ${line}`}>{header(c)}</td>
                  <td className={`px-4 py-2.5 align-middle ${line}`}>{values(c)}</td>
                  <td className={`px-4 py-2 align-middle ${line}`}>{choice(c)}</td>
                  <td className={`px-4 py-2.5 align-middle text-[15px] leading-snug ${line}`}>
                    <Decided c={c} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="border-t border-rule @3xl:hidden">
        {f.mapping.map((c) => (
          <li key={c.index} className="border-b border-rule last:border-b-0">
            <p className="flex items-center gap-3 bg-well/60 px-4 py-1.5">
              <span className="w-5 text-center text-[14px] tabular-nums text-ink-faint">{letter(c)}</span>
              {header(c)}
            </p>
            <div className="space-y-2.5 px-4 py-3">
              {values(c)}
              {choice(c)}
              <p className="text-[15px] leading-snug">
                <Decided c={c} />
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
