import { createRoot } from 'react-dom/client';
import { App } from './PopupApp';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
