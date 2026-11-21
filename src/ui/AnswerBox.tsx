import { useState } from 'react';
import { Check } from 'lucide-react';
import { useSession } from '../app/session';
import { ptAt } from '../core/i18n';
import { locale, msgs } from '../i18n/lang';
import { useT } from '../i18n/react';
import { Button } from './kit';

const M = msgs(
  {
    answerFrom: (owner: string) => `Answer from ${owner}:`,
    recorded: (time: string, by: string) => `(recorded ${time}${by ? ` by ${by}` : ''})`,
    placeholder: (owner: string) => `${owner}'s answer, once you have it`,
    record: 'Record the answer',
  },
  {
    answerFrom: (owner) => `Resposta de ${owner}:`,
    recorded: (time, by) => `(registada ${ptAt(time)}${by ? ` por ${by}` : ''})`,
    placeholder: (owner) => `Resposta de ${owner}, quando a tiver`,
    record: 'Registar a resposta',
  },
);

/**
 * Closes the loop on a question for the nurse: the reviewer writes down the answer that was given (by
 * phone, on the paper sheet, in person) and when. The answer is kept with the review and in the audit trail;
 * deciding the row afterwards is still a separate, deliberate step.
 */
export function AnswerBox({ refId, owner, compact = false }: { refId: string; owner: string; compact?: boolean }) {
  const s = useSession();
  const t = useT(M);
  const answer = s.session?.answers?.[refId];
  const [text, setText] = useState('');
  if (answer)
    return (
      <p className="flex items-start gap-1.5 text-[15px] text-scrub">
        <Check size={16} className="mt-0.5 shrink-0" />
        <span>
          <strong className="font-semibold">{t.answerFrom(owner)}</strong> {answer.text}{' '}
          <span className="text-sm text-ink-faint">
            {t.recorded(new Date(answer.at).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }), answer.recordedBy ?? '')}
          </span>
        </span>
      </p>
    );
  return (
    <form
      className={`no-print flex flex-wrap items-center gap-2 ${compact ? '' : 'mt-2'}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) s.recordAnswer(refId, text.trim());
      }}
    >
      <label className="sr-only" htmlFor={`ans-${refId}`}>
        {t.answerFrom(owner)}
      </label>
      <input
        id={`ans-${refId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.placeholder(owner)}
        className="min-w-[16rem] flex-1 rounded-md border border-rule-strong bg-sheet px-3 py-1.5 text-[15px]"
      />
      <Button tone="secondary" type="submit" disabled={!text.trim()}>
        {t.record}
      </Button>
    </form>
  );
}
