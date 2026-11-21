import { CANONICAL_FIELDS, type CanonicalField } from '../core/fields';
import type { SourceFile } from '../core/types';
import { useSession } from '../app/session';
import { Button, LanternMark, Notice, RanOn } from '../ui/kit';

export const FIELD_LABEL: Record<CanonicalField, string> = {
  bed: 'Bed',
  patient_name: 'Patient name',
  patient_id: 'Hospital number',
  patient: 'Name and hospital number',
  event_time: 'Time',
  act: 'What was done',
  notes: 'Comments',
  documented_by: 'Who wrote it',
  ignore: 'Not needed',
};

export function versionName(f: SourceFile, kind: 'drill' | 'import'): string {
  if (kind === 'drill') return { census: 'Census at 21:00', v1: 'Version 1, emailed 03:10', v2: 'Version 2, reply-all 07:40' }[f.id] ?? f.name;
  return { census: 'Census', v1: 'Earlier version', v2: 'Later version' }[f.id] ?? f.name;
}

export default function Sources() {
  const s = useSession();
  const session = s.session!;
  const flagged = session.files.flatMap((f) => f.mapping.filter((c) => c.needsReview)).length;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LanternMark />
          <span className="text-lg font-semibold">Lantern</span>
          <span className="ml-3 text-ink-soft">{session.title}</span>
        </div>
        <Button tone="quiet" onClick={() => void s.reset()}>
          Start over
        </Button>
      </header>

      <h1 className="text-3xl font-semibold tracking-[-0.01em]">Check what each column means</h1>
      <p className="mt-3 max-w-[64ch] text-lg text-ink-soft">
        Every ward invents its own columns during an outage. Lantern read the headers and the values, and proposes what each column holds.
        {flagged
          ? ` ${flagged} ${flagged === 1 ? 'column needs' : 'columns need'} your eye before comparing.`
          : ' Nothing looked doubtful, but have a glance before comparing.'}
      </p>

      <div className="mt-10 space-y-12">
        {session.files.map((f) => (
          <section key={f.id} aria-labelledby={`f-${f.id}`}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
              <h2 id={`f-${f.id}`} className="text-xl font-semibold">
                {versionName(f, session.kind)}
              </h2>
              <span className="text-sm text-ink-faint">
                {f.name}, {f.rows.length} rows
              </span>
            </div>
            <div className="overflow-x-auto rounded-[3px] border border-rule-strong bg-sheet">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-rule-strong bg-paper text-sm text-ink-soft">
                    <th className="w-[22%] px-3 py-2 font-normal">Column in the file</th>
                    <th className="px-3 py-2 font-normal">First values</th>
                    <th className="w-[24%] px-3 py-2 font-normal">Lantern reads it as</th>
                  </tr>
                </thead>
                <tbody>
                  {f.mapping.map((c) => (
                    <tr key={c.index} className={`border-b border-rule last:border-b-0 ${c.needsReview ? 'bg-pen-wash/60' : ''}`}>
                      <td className="px-3 py-2.5 align-top font-mono text-[15px]">{c.header || <span className="text-ink-faint">(no header)</span>}</td>
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
                          {!f.rows.some((r) => r[c.index]) && <span className="text-ink-faint">(empty)</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <select
                          aria-label={`Meaning of column ${c.header}`}
                          value={c.field}
                          onChange={(e) => s.setField(f.id, c.index, e.target.value as CanonicalField)}
                          className="w-full rounded-md border border-rule-strong bg-sheet px-2 py-1.5 text-[15px]"
                        >
                          {CANONICAL_FIELDS.map((k) => (
                            <option key={k} value={k}>
                              {FIELD_LABEL[k]}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-[13px] text-ink-faint">
                          {c.needsReview ? <span className="text-pen">{c.reason ?? 'Please confirm'}</span> : c.basis === 'agree' ? 'Header and values agree' : c.basis === 'rule' && c.reason ? c.reason : c.model ? 'Read from the header' : 'Read from the values'}
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
          Compare the two versions
        </Button>
        <span className="flex items-center gap-2 text-sm text-ink-soft">
          Runs <RanOn source="on_device" />{' '}
          {session.kind === 'drill' && s.local !== 'available' ? 'where available; this browser will use the cloud for the synthetic drill' : ''}
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
