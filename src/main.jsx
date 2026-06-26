import React from 'react'
import { createRoot } from 'react-dom/client'
import Root from './Root.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Root />
  </ErrorBoundary>,
)
