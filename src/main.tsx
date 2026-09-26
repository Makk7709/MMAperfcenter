import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import '@fontsource/barlow-semi-condensed/latin-500.css'
import '@fontsource/barlow-semi-condensed/latin-600.css'
import '@fontsource/barlow-semi-condensed/latin-700.css'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import './index.css'
import { initSentry, Sentry } from './lib/sentry'
import { AppErrorFallback } from './components/AppErrorFallback'

initSentry();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root introuvable");
createRoot(rootElement).render(
  <Sentry.ErrorBoundary fallback={({ resetError }) => <AppErrorFallback resetError={resetError} />}>
    <App />
  </Sentry.ErrorBoundary>,
);
