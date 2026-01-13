import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// PrimeReact Core and Icons (Import only ONCE)
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

// Choose ONLY ONE theme. Let's use Cyan as it matches your "Teal" buttons best.
import 'primereact/resources/themes/lara-light-cyan/theme.css';

import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)