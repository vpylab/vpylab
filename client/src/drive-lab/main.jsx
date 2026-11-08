import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DriveLabApp from './DriveLabApp.jsx';
import './drive-lab.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DriveLabApp />
  </StrictMode>,
);
