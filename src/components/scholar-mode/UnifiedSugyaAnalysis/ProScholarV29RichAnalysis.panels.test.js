/**
 * Tests de rendu des composants de ProScholarV29RichAnalysis.panels —
 * filet exigé par la recette avant le split en fichiers séparés.
 * Texte factice avec marqueurs de Gemara pour déclencher les analyses.
 */
import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  ShabbatCasesGrid,
  GemaraDeepAnalysis,
  RabbisDetailPanel,
  SourceQualityIndicator,
  CrossReferencesPanel,
  SugyaMermaidDiagram,
  V29CrossReferencePanel,
  HalakhicConceptsMap,
  StudyProgressTracker
} from './ProScholarV29RichAnalysis.panels';

const GEMARA_TEXT =
  'משנה: הכל שחין. גמ׳ תנן התם אמר רב יהודה אמר רב — מאן תנא. תנו רבנן ופליגא. ' +
  'וכן לעניין שבת: עני פשט יד פנימה ונתן — עני חייב. Il faut répéter du contenu substantiel ' +
  'pour dépasser le seuil de 200 caractères : la discussion porte sur la amoraïque, les questions ' +
  'et réponses du sugya, les opinions des tannaim et les halakhot qui en découlent pour la halakha.';

const RABBIS = [
  { name: 'רבי עקיבא', era: 'tanna', opinions: [] }
];

describe('ProScholarV29RichAnalysis.panels (rendu)', () => {
  test('ShabbatCasesGrid : rend la grille des 12 cases', () => {
    const { container } = render(<ShabbatCasesGrid text={GEMARA_TEXT} />);
    expect(container.textContent).toContain('עני חייב');
  });

  test('GemaraDeepAnalysis : rend sur un texte de Gemara', () => {
    const { container } = render(
      <GemaraDeepAnalysis patterns={null} qaFlow={null} rabbis={RABBIS} text={GEMARA_TEXT} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  test('RabbisDetailPanel : rend avec des rabbins', () => {
    const { container } = render(<RabbisDetailPanel rabbis={RABBIS} />);
    expect(container.textContent).toContain('עקיבא');
  });

  test('SourceQualityIndicator : rend avec une analyse minimale', () => {
    const { container } = render(
      <SourceQualityIndicator analysis={{ quality: 'high', signals: [] }} text={GEMARA_TEXT} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  test('CrossReferencesPanel : rend sur un texte', () => {
    const { container } = render(<CrossReferencesPanel text={GEMARA_TEXT} />);
    expect(container.firstChild).toBeTruthy();
  });

  test('SugyaMermaidDiagram : rend sur un texte', () => {
    const { container } = render(<SugyaMermaidDiagram text={GEMARA_TEXT} patterns={[]} />);
    expect(container.firstChild).toBeTruthy();
  });

  test('V29CrossReferencePanel : rend sur un texte', () => {
    const { container } = render(<V29CrossReferencePanel text={GEMARA_TEXT} />);
    expect(container.firstChild).toBeTruthy();
  });

  test('HalakhicConceptsMap : rend sur un texte', () => {
    const { container } = render(<HalakhicConceptsMap text={GEMARA_TEXT} />);
    expect(container.firstChild).toBeTruthy();
  });

  test('StudyProgressTracker : rend avec une analyse', () => {
    const { container } = render(
      <StudyProgressTracker analysis={{ progress: 40, milestones: [] }} />
    );
    expect(container.firstChild).toBeTruthy();
  });
});
