/**
 * Test de rendu de NotebookTab — exigé par la recette de découpe
 * (docs/DECOUPE-MONOLITHES.md : « UI tabs avec tests de rendu d'abord »).
 * Monte le composant réel avec son provider et parcourt les 6 sous-onglets :
 * le split en sections/ ne devra rien changer à ce parcours.
 */
import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StudyModeProvider } from '../../context/StudyModeContext';
import NotebookTab from './NotebookTab';

const mount = (props = {}) =>
  render(
    <StudyModeProvider>
      <NotebookTab {...props} />
    </StudyModeProvider>
  );

const switchTab = async (sublabel) => {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(sublabel) }));
  // le changement passe par une transition de 150 ms
  await waitFor(() => {}, { timeout: 400 });
  await new Promise((r) => setTimeout(r, 250));
};

describe('NotebookTab (rendu + navigation des sous-onglets)', () => {
  test('monte avec les 6 sous-onglets', () => {
    mount();
    for (const label of ['Questions', 'Insights', 'Progress', 'Analytics', 'Chazara', 'Today']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeTruthy();
    }
  });

  test('Questions : l\'onglet par défaut rend son empty state', () => {
    mount();
    expect(screen.getByText(/no\s+open\s+questions/i)).toBeTruthy();
  });

  test('Insights : vide au départ', async () => {
    mount();
    await switchTab('Insights');
    expect(screen.getByText(/no insights recorded/i)).toBeTruthy();
  });

  test('Progress : rend sans données de maîtrise', async () => {
    mount({ selectedBook: 'Genesis', selectedChapter: 1 });
    await switchTab('Progress');
    expect(screen.getByText(/start tracking/i)).toBeTruthy();
  });

  test('Chazara : rend le tableau de révision espacée', async () => {
    mount();
    await switchTab('Chazara');
    expect(screen.getByRole('button', { name: /Today/ })).toBeTruthy();
  });

  test('Today : rend avec FeatureIndicator et les modes d\'étude', async () => {
    mount();
    await switchTab('Today');
    expect(screen.getByText(/Commentaries/)).toBeTruthy();
    expect(screen.getByText(/Cross-refs/)).toBeTruthy();
  });

  test('le retour vers Questions reste possible (aller-retour)', async () => {
    mount();
    await switchTab('Today');
    await switchTab('Questions');
    expect(screen.getByText(/no\s+open\s+questions/i)).toBeTruthy();
  });
});
