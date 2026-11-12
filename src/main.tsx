import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/geist'
import './index.css'
import App from './App'
import { SystemProvider } from './lib/system-context'
import { AuthGate } from './components/auth-gate'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><SystemProvider><AuthGate><App /></AuthGate></SystemProvider></React.StrictMode>)
