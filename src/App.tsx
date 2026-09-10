import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './views/Home';
import { WelcomeSettings } from './views/WelcomeSettings';
import { ActiveSession } from './views/ActiveSession';
import { CouncilSession } from './views/CouncilSession';
import { Synthesis } from './views/Synthesis';
import { Onboarding } from './views/Onboarding';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="settings" element={<WelcomeSettings />} />
          <Route path="session" element={<ActiveSession />} />
          <Route path="council" element={<CouncilSession />} />
          <Route path="synthesis" element={<Synthesis />} />
          <Route path="onboarding" element={<Onboarding />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
