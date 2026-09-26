import { createRoot } from 'react-dom/client'
import App from './App.tsx'
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
