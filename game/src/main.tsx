import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import MapSVG from './MapSVG.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <MapSVG />
    </React.StrictMode>,
)
