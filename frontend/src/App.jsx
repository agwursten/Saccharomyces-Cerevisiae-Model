import React, { useState, useMemo, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { buildTheme } from './theme/theme';
import NavigationBar from './components/NavigationBar';
import TheoryPage from './pages/TheoryPage';
import ChemostatPage from './pages/ChemostatPage';
import BatchPage from './pages/BatchPage';
import ParametersPage from './pages/ParametersPage';

/**
 * Global app context: parameter overrides plus solver configuration.
 * Both propagate through every page that calls the backend.
 */
export const AppContext = createContext({
  overrides: {},
  setOverrides: () => {},
  solver: 'lsoda',
  setSolver: () => {},
  rk4Step: 0.01,
  setRk4Step: () => {},
});

export const useAppContext = () => useContext(AppContext);

export default function App() {
  const [mode, setMode] = useState('dark');
  const [overrides, setOverrides] = useState({});
  const [solver, setSolver] = useState('lsoda');
  const [rk4Step, setRk4Step] = useState(0.005);

  const theme = useMemo(() => buildTheme(mode), [mode]);
  const toggleMode = () => setMode(m => (m === 'dark' ? 'light' : 'dark'));

  return (
    <AppContext.Provider value={{
      overrides, setOverrides,
      solver, setSolver,
      rk4Step, setRk4Step,
    }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <NavigationBar mode={mode} onToggleMode={toggleMode} />
          <Box component="main" sx={{ flexGrow: 1, py: 3, px: { xs: 2, md: 4 } }}>
            <Routes>
              <Route path="/"            element={<TheoryPage />} />
              <Route path="/chemostat"   element={<ChemostatPage />} />
              <Route path="/batch"       element={<BatchPage />} />
              <Route path="/parameters"  element={<ParametersPage />} />
              <Route path="*"            element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
        </Box>
      </ThemeProvider>
    </AppContext.Provider>
  );
}
