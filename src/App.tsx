import { useCallback, useEffect, useState } from 'react';
import { useAppState } from './lib/store';
import { Home, Train } from './screens/Home';
import { Onboarding } from './screens/Onboarding';
import { OpeningSession, OpeningsMenu } from './screens/Openings';
import { PuzzleSession } from './screens/Middlegame';
import { EndgameSession, EndgamesMenu } from './screens/Endgames';
import { PlayGame, PlaySetup } from './screens/Play';
import { Review } from './screens/Review';
import { Profile } from './screens/Profile';

type Route = { name: string; [k: string]: any };

const TABS = [
  { name: 'home', icon: '🏠', label: 'Start' },
  { name: 'train', icon: '🎓', label: 'Lernen' },
  { name: 'play', icon: '⚔️', label: 'Spielen' },
  { name: 'profile', icon: '📈', label: 'Fortschritt' },
];

export default function App() {
  const s = useAppState();
  const [route, setRoute] = useState<Route>(() => ({ name: 'home' }));

  const go = useCallback((r: Route) => {
    history.pushState(r, '');
    setRoute(r);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    history.replaceState({ name: 'home' }, '');
    const onPop = (e: PopStateEvent) => setRoute(e.state ?? { name: 'home' });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (!s.onboarded) return <Onboarding />;

  const tab = ['home', 'train', 'play', 'profile'].includes(route.name) ? route.name : null;
  let screen;
  switch (route.name) {
    case 'home':
      screen = <Home go={go} />;
      break;
    case 'train':
      screen = <Train go={go} />;
      break;
    case 'openings':
      screen = <OpeningsMenu go={go} />;
      break;
    case 'opening-session':
      screen = <OpeningSession key={route.openingId ?? 'all'} openingId={route.openingId} go={go} />;
      break;
    case 'middlegame':
      screen = <PuzzleSession go={go} />;
      break;
    case 'mistakes':
      screen = <PuzzleSession onlyMistakes go={go} />;
      break;
    case 'endgames':
      screen = <EndgamesMenu go={go} />;
      break;
    case 'endgame-session':
      screen = <EndgameSession key={route.id} id={route.id} go={go} />;
      break;
    case 'play':
      screen = <PlaySetup go={go} />;
      break;
    case 'play-game':
      screen = <PlayGame key={route.token} color={route.color} elo={route.elo} go={go} />;
      break;
    case 'review':
      screen = <Review key={route.id} id={route.id} go={go} />;
      break;
    case 'profile':
      screen = <Profile go={go} />;
      break;
    default:
      screen = <Home go={go} />;
  }

  return (
    <div className="app">
      <main>{screen}</main>
      {tab && (
        <nav className="tabbar">
          {TABS.map((t) => (
            <button key={t.name} className={tab === t.name ? 'on' : ''} onClick={() => go({ name: t.name })}>
              <span className="tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
