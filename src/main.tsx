import ReactDOM from 'react-dom/client';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import '@fontsource/inter/200.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/800.css';
import App from './App';
import { initDiagnosticLogger } from './services/diagnostic-logger';
import './index.css';

initDiagnosticLogger();

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
