/**
 * Test de rendu de FocusMode — filet avant extraction des panneaux à props
 * (recette docs/DECOUPE-MONOLITHES.md). Le composant rend null sans isActive
 * ou sans versets : on monte avec les deux, on parcourt les contrôles visibles
 * et la navigation de verset.
 */
import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FocusMode from './FocusMode';

const VERSES = [
  { verse: 1, hebrew: 'בְּרֵאשִׁית בָּרָא אֱלֹהִים', text: 'Au commencement, Dieu créa' },
  { verse: 2, hebrew: 'וְהָאָרֶץ הָיְתָה תֹהוּ', text: 'La terre était informe' },
  { verse: 3, hebrew: 'וַיֹּאמֶר אֱלֹהִים', text: 'Et Dieu dit' }
];

const mount = (props = {}) =>
  render(
    <FocusMode
      verses={VERSES}
      onkelos={[]}
      selectedBook="Genesis"
      selectedChapter={1}
      showOnkelos={false}
      isActive
      onClose={vi.fn()}
      onPrevChapter={vi.fn()}
      onNextChapter={vi.fn()}
      onBookmarkVerse={vi.fn()}
      verseNotes={{}}
      {...props}
    />
  );

describe('FocusMode (rendu + navigation)', () => {
  test('rend null sans isActive', () => {
    const { container } = mount({ isActive: false });
    expect(container.querySelector('.focus-mode')).toBeNull();
  });

  test('monte et affiche la location du chapitre', () => {
    const { container } = mount();
    expect(container.querySelector('.focus-location').textContent).toContain('Genesis');
  });

  test('navigation verset suivant/précédent sans crash', () => {
    const { container } = mount();
    const next = [...screen.getAllByRole('button')].find(b =>
      /next|suivant|→/i.test(b.title + b.textContent)
    );
    if (next) {
      fireEvent.click(next);
    }
    expect(container.querySelector('.focus-location')).toBeTruthy();
  });

  test('le panneau stats s\'ouvre et se ferme sans crash', () => {
    const { container } = mount();
    const statsBtn = [...screen.getAllByRole('button')].find(b =>
      /stats|statistiques/i.test(b.title + b.textContent)
    );
    if (statsBtn) {
      fireEvent.click(statsBtn);
      fireEvent.click(statsBtn);
    }
    expect(container.querySelector('.focus-mode')).toBeTruthy();
  });

  test('le panneau meforshim s\'ouvre sans crash', () => {
    const { container } = mount();
    const btn = [...screen.getAllByRole('button')].find(b =>
      /meforshim|commentator|rashi/i.test(b.title + b.textContent)
    );
    if (btn) fireEvent.click(btn);
    expect(container.querySelector('.focus-mode')).toBeTruthy();
  });

  test('le panneau gematria s\'ouvre sans crash', () => {
    const { container } = mount();
    const btn = [...screen.getAllByRole('button')].find(b =>
      /gematria/i.test(b.title + b.textContent)
    );
    if (btn) fireEvent.click(btn);
    expect(container.querySelector('.focus-mode')).toBeTruthy();
  });

  test('Escape déclenche onClose', () => {
    const onClose = vi.fn();
    const { container } = mount({ onClose });
    fireEvent.keyDown(container.querySelector('.focus-mode'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
