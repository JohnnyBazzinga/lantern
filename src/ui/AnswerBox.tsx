import { useState } from 'react';
import { Check } from 'lucide-react';
import { useSession } from '../app/session';
import { Button } from './kit';

/**
 * Closes the loop on a question for the nurse: the reviewer writes down the answer she gave (by phone,
 * on the paper sheet, in person) and when. The answer is kept with the review and in the audit trail;
 * deciding the row afterwards is still a separate, deliberate step.
 */
export function AnswerBox({ refId, owner, compact = false }: { refId: string; owner: string; compact?: boolean }) {
  const s = useSession();
  const answer = s.session?.answers?.[refId];
  const [text, setText] = useState('');
  if (answer)
    return (
      <p className="flex items-start gap-1.5 text-[15px] text-scrub">
        <Check size={16} className="mt-0.5 shrink-0" />
        <span>
          <strong className="font-semibold">Answer from {owner}:</strong> {answer.text}{' '}
          <span className="text-sm text-ink-faint">
            (recorded {new Date(answer.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {answer.recordedBy ? ` by ${answer.recordedBy}` : ''})
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
        Answer from {owner}
      </label>
      <input
        id={`ans-${refId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`${owner}'s answer, once you have it`}
        className="min-w-[16rem] flex-1 rounded-md border border-rule-strong bg-sheet px-3 py-1.5 text-[15px]"
      />
      <Button tone="secondary" type="submit" disabled={!text.trim()}>
        Record the answer
      </Button>
    </form>
  );
}
