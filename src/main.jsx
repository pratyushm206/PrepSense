import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import './styles.css';

const storedTheme = window.localStorage.getItem('ps-theme');
const systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
const initialTheme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : systemTheme || 'dark';
document.documentElement.setAttribute('data-theme', initialTheme);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/*" element={<App />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
