import { lazy, Suspense, useEffect, useState } from 'react';

const Lab = lazy(() => import('./screens/Lab'));

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
  return (
    <Suspense fallback={<div className="p-8 text-ink-400">Loading…</div>}>
      {route.startsWith('/lab') ? <Lab /> : <Home />}
    </Suspense>
  );
}

function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-xs uppercase tracking-[0.25em] text-lamp">Lantern</p>
      <h1 className="text-4xl font-semibold leading-tight">
        When the hospital&apos;s systems go dark, the ward keeps writing.
        <span className="block text-ink-400">Lantern turns what they wrote into records you can trust.</span>
      </h1>
      <p className="text-ink-200">
        Import the spreadsheets and paper notes from an IT outage. Lantern maps them, links every act to its source cell and
        helps you decide, row by row, what goes back into the record. Patient data stays on this device.
      </p>
      <div className="flex gap-3">
        <a href="#/lab" className="rounded-lg border border-ink-600 px-4 py-2 text-sm hover:bg-ink-800">
          Open the Lab (day-1 tests)
        </a>
      </div>
      <p className="text-xs text-ink-400">Prototype · synthetic data only · documentation aid, not a medical device.</p>
    </main>
  );
}
