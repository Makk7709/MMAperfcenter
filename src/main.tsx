import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initSentry } from './lib/sentry'

initSentry();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root introuvable");
createRoot(rootElement).render(<App />);
