import { lazy, Suspense, useEffect, useState } from 'react';
import { SessionProvider, useSession } from './app/session';
import Start from './screens/Start';
import Sources from './screens/Sources';
import Review from './screens/Review';
import Worklist from './screens/Worklist';
import Result from './screens/Result';
import Working from './screens/Working';

const Lab = lazy(() => import('./screens/Lab'));
const Check = lazy(() => import('./screens/Check'));

function useHashRoute(): string {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#/, '') || '/');
  useEffect(() => {
    const on = () => setRoute(window.location.hash.replace(/^#/, '') || '/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export default function App() {
  const route = useHashRoute();
  if (route.startsWith('/lab'))
    return (
      <div className="min-h-full bg-ink-900 text-ink-50">
        <Suspense fallback={<div className="p-8 text-ink-400">Loading…</div>}>
          <Lab />
        </Suspense>
      </div>
    );
  if (route.startsWith('/check'))
    return (
      <Suspense fallback={null}>
        <Check />
      </Suspense>
    );
  return (
    <SessionProvider>
      <Product />
    </SessionProvider>
  );
}

function Product() {
  const { session } = useSession();
  const [view, setView] = useState<'review' | 'worklist' | 'result'>('review');
  useEffect(() => {
    if (!session?.acts.length) setView('review');
  }, [session?.id, session?.acts.length]);
  useEffect(() => {
    window.scrollTo({ top: 0 }); // recent Chrome returns a Promise here; never return it to React
  }, [view]);

  let screen;
  if (!session) screen = <Start />;
  else if (!session.acts.length) screen = <Sources />;
  else if (view === 'worklist') screen = <Worklist onBack={() => setView('review')} onResult={() => setView('result')} />;
  else if (view === 'result') screen = <Result onBack={() => setView('worklist')} />;
  else screen = <Review onWorklist={() => setView('worklist')} />;
  return (
    <>
      {screen}
      <Working />
    </>
  );
}
