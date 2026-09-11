import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { store } from './store/store';
import App from './App';

/**
 * Entry point.
 * - Provider makes the Redux store available to the whole app.
 * - ThemeProvider + CssBaseline apply MUI's baseline styles and a theme.
 */

// A simple theme; customize colors here later if you want a branded look.
const theme = createTheme({
  palette: {
    primary: { main: '#1f4e79' }, // matches the deep blue used in the docs
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
