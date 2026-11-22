import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { subscribeLedger, type LedgerEntry } from '../ai/ledger';
import { msgs } from '../i18n/lang';
import { useT } from '../i18n/react';
import { Route } from './kit';

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
 */
export function Tally({ kind }: { kind: 'drill' | 'import' }) {
  const t = useT(M);
  const ledger = useLedger();
  const cloudCalls = ledger.filter((e) => e.inferenceSource === 'in_cloud');
  const sentRows = new Set(cloudCalls.flatMap((e) => e.outgoingRefs.filter((r) => r.includes(':')))).size;
  const deviceCalls = ledger.filter((e) => e.inferenceSource === 'on_device').length;
  const wide = 'lg:max-[1399px]:hidden'; // between those widths the bar has room for the icon and the count only
  return (
    <>
      <span className="flex items-center gap-1.5 whitespace-nowrap text-[15px]" title={t.countedFrom}>
        <ShieldCheck size={18} className="text-ink-soft" aria-hidden />
        {t.sent} <strong className="font-semibold">{t.none}</strong>
      </span>
      <span className="flex items-center gap-2">
        <span title={deviceCalls ? t.deviceTitle(deviceCalls) : t.noDevice}>
          <Route source="on_device" muted={deviceCalls === 0}>
            <span className={wide}>{t.device}</span> <span className="tabular-nums">{deviceCalls}</span>
          </Route>
        </span>
        <span title={kind === 'import' ? t.cloudOffTitle : t.cloudTitle(sentRows)}>
          <Route source="in_cloud" muted={kind === 'import' || sentRows === 0}>
            <span className={wide}>{t.cloud}</span>{' '}
            {kind === 'import' ? t.cloudOff : <span className="tabular-nums">{cloudCalls.length ? t.cloudRows(sentRows) : 0}</span>}
          </Route>
        </span>
        <span className="hidden min-[1640px]:inline">
          <Route source="rule">{t.rules}</Route>
        </span>
      </span>
    </>
  );
}
