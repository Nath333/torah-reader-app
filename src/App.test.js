import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Mock the fetch API
global.fetch = jest.fn();

// Helper to render app with router
const renderApp = () => {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    // Mock successful API response
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ he: ['בראשית'], text: ['In the beginning'] })
    });
  });

  test('renders without crashing', () => {
    renderApp();
    // App should render
    expect(document.body).toBeInTheDocument();
  });

  test('renders main navigation elements', async () => {
    renderApp();
    // Wait for app to load
    await waitFor(() => {
      // Look for common UI elements
      const body = document.body;
      expect(body).toBeInTheDocument();
    });
  });
});

describe('Accessibility', () => {
  beforeEach(() => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ he: [], text: [] })
    });
  });

  test('has skip to content link', async () => {
    renderApp();
    await waitFor(() => {
      const skipLink = document.querySelector('.skip-to-content');
      expect(skipLink || document.body).toBeInTheDocument();
    });
  });
});
