import { useEffect, useState } from 'react';
import { Cloud, Info, Laptop, ShieldCheck } from 'lucide-react';
import { subscribeLedger, type LedgerEntry } from '../ai/ledger';
import { msgs } from '../i18n/lang';
import { useT } from '../i18n/react';

const M = msgs(
  {
    sent: 'Patient data sent:',
    none: 'none',
    countedFrom: 'Counted from the requests this page made',
    device: 'On this device',
    deviceTitle: (n: number) => `${n} AI ${n === 1 ? 'call' : 'calls'} ran on this device`,
    noDevice: 'No on-device model has run on this PC in this review',
    cloud: 'Cloud',
    cloudRows: (n: number) => `${n} fictional ${n === 1 ? 'row' : 'rows'}`,
    cloudTitle: (n: number) => `${n} fictional drill ${n === 1 ? 'row was' : 'rows were'} sent to the cloud. No patient data.`,
    cloudOff: 'not used',
    cloudOffTitle: 'Your own files are never sent to the cloud',
    rules: 'Rules check every row',
  },
  {
    sent: 'Dados de doentes enviados:',
    none: 'nenhum',
    countedFrom: 'Contado a partir dos pedidos que esta página fez',
    device: 'Neste computador',
    deviceTitle: (n) => `${n} ${n === 1 ? 'pedido à IA correu' : 'pedidos à IA correram'} neste computador`,
    noDevice: 'Nenhum modelo local correu neste computador nesta revisão',
    cloud: 'Nuvem',
    cloudRows: (n) => `${n} ${n === 1 ? 'linha fictícia' : 'linhas fictícias'}`,
    cloudTitle: (n) => `${n} ${n === 1 ? 'linha fictícia do simulacro foi enviada' : 'linhas fictícias do simulacro foram enviadas'} para a nuvem. Nenhum dado de doentes.`,
    cloudOff: 'não usada',
    cloudOffTitle: 'Os seus ficheiros nunca são enviados para a nuvem',
    rules: 'As regras verificam todas as linhas',
  },
);

function useLedger(): LedgerEntry[] {
  const [es, setEs] = useState<LedgerEntry[]>([]);
  useEffect(() => subscribeLedger(setEs), []);
  return es;
}

/**
 * What has left this PC, and where the AI ran, from the ledger (which counts the requests the page
 * really made). It sits in the top bar of every screen after Start: the hybrid story, always in frame.
 * The (i) on the cloud chip opens one sentence on what went there.
 */
export function Tally({ kind }: { kind: 'drill' | 'import' }) {
  const t = useT(M);
  const ledger = useLedger();
  const [open, setOpen] = useState(false);
  const cloudCalls = ledger.filter((e) => e.inferenceSource === 'in_cloud');
  const sentRows = new Set(cloudCalls.flatMap((e) => e.outgoingRefs.filter((r) => r.includes(':')))).size;
  const deviceCalls = ledger.filter((e) => e.inferenceSource === 'on_device').length;
  const wide = 'max-[1499px]:sr-only'; // below that width the bar has room for the icon and the count only; the name stays for screen readers
  const chip = 'inline-flex min-h-[34px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[14px] font-semibold';
  const cloudSay = kind === 'import' ? t.cloudOffTitle : t.cloudTitle(sentRows);
  return (
    <span className="flex w-full flex-wrap items-center gap-1.5 sm:gap-2 lg:w-auto lg:flex-nowrap">
      <span title={deviceCalls ? t.deviceTitle(deviceCalls) : t.noDevice} className={`${chip} ${deviceCalls ? 'bg-mint text-forest' : 'bg-stone text-ink-soft'}`}>
        <Laptop size={17} strokeWidth={2} aria-hidden />
        <span className={wide}>{t.device}</span> <span className="tabular-nums">{deviceCalls}</span>
      </span>
      <span className="relative">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          onBlur={() => setOpen(false)}
          className={`${chip} bg-stone text-ink hover:bg-well`}
        >
          <Cloud size={17} strokeWidth={2} aria-hidden />
          <span className={wide}>{t.cloud}</span>{' '}
          {kind === 'import' ? <span className="font-normal">{t.cloudOff}</span> : <span className="tabular-nums">{cloudCalls.length ? t.cloudRows(sentRows) : 0}</span>}
          <Info size={15} strokeWidth={2} className="text-ink-soft" aria-hidden />
          <span className="sr-only">: {cloudSay}</span>
        </button>
        {open && (
          <span role="status" className="absolute right-0 top-[calc(100%+6px)] z-40 w-[18rem] rounded-xl border border-rule bg-sheet p-3 text-[14px] font-normal leading-snug text-ink shadow-[0_8px_24px_-8px_rgba(30,40,30,0.25)]">
            {cloudSay} <span className="mt-1 block text-ink-soft">{t.countedFrom}.</span>
          </span>
        )}
      </span>
      <span className={`${chip} ml-auto bg-stone font-normal text-ink lg:ml-0`} title={t.countedFrom}>
        <ShieldCheck size={17} strokeWidth={2} className="text-ink-soft" aria-hidden />
        {t.sent} <strong className="font-semibold">{t.none}</strong>
      </span>
    </span>
  );
}
