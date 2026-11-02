import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {registerHaldiaServiceWorker} from './lib/offlineQueue';

registerHaldiaServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);

