/**
 * TzuratHaDaf Component Tests
 *
 * Tests the Traditional Talmud Page Layout component including:
 * - Rendering with different layout styles
 * - Loading states
 * - Column visibility toggles
 * - Zoom controls
 * - Navigation callbacks
 * - Settings panel
 * - Discourse markers
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TzuratHaDaf from './TzuratHaDaf';

// Mock the sefariaApi service
jest.mock('../../services/sefariaApi', () => ({
  getRashiOnTalmud: jest.fn(),
  getTosafotForDaf: jest.fn(),
  getMaharshaForDaf: jest.fn(),
}));

// Mock the discourse pattern service
jest.mock('../../services/discoursePatternService', () => ({
  detectStructuralMarkers: jest.fn(() => []),
  TALMUDIC_PATTERNS: {
    question: { icon: '❓', label: 'Question', color: '#3b82f6' },
    answer: { icon: '💡', label: 'Answer', color: '#10b981' },
    objection: { icon: '⚡', label: 'Objection', color: '#f59e0b' },
    resolution: { icon: '✓', label: 'Resolution', color: '#8b5cf6' },
    citation: { icon: '📜', label: 'Citation', color: '#6366f1' },
    teaching: { icon: '📖', label: 'Teaching', color: '#ec4899' },
  },
}));

// Mock the abbreviations service
jest.mock('../../services/talmudicAbbreviationsService', () => ({
  findAbbreviations: jest.fn(() => []),
}));

// Mock the hebrewUtils
jest.mock('../../utils/hebrewUtils', () => ({
  processHebrewText: jest.fn((text) => text),
  getDisplayModeLabel: jest.fn(() => 'Full'),
}));

// Mock the useLocalStorage hook
const mockSetLocalStorage = jest.fn();
jest.mock('../../hooks/useLocalStorage', () => ({
  useLocalStorage: (key, defaultValue) => {
    const values = {
      'daf-zoom': 100,
      'daf-layout-style': 'ozvehadar',
      'daf-discourse-markers': true,
      'daf-translation': false,
      'daf-vowels': true,
      'daf-cantillation': true,
      'daf-abbreviations': true,
      'daf-column-overrides': { rashi: null, tosafot: null, translation: null },
    };
    return [values[key] ?? defaultValue, mockSetLocalStorage];
  },
}));

// Mock the sanitize utility
jest.mock('../../utils/sanitize', () => ({
  removeHtmlTags: jest.fn((text) => text),
}));

// Mock the ClickableText component
jest.mock('../core/ClickableText', () => {
  return function MockClickableText({ text, className }) {
    return <span className={className} data-testid="clickable-text">{text}</span>;
  };
});

// Import mocked services for assertions
const { getRashiOnTalmud, getTosafotForDaf, getMaharshaForDaf } = require('../../services/sefariaApi');

describe('TzuratHaDaf', () => {
  const defaultProps = {
    verses: [
      { hebrewText: 'מתני׳ מאימתי קורין', englishText: 'From what time do we recite' },
      { hebrewText: 'את שמע בערבין', englishText: 'the Shema in the evening' },
    ],
    selectedBook: 'Berakhot',
    selectedChapter: '2a',
  };

  // Suppress console.error for expected error handling tests
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Suppress expected console.error calls during tests
    console.error = jest.fn();

    // Setup default mock responses
    getRashiOnTalmud.mockResolvedValue({
      comments: [
        { hebrew: 'פירוש רש"י', dibbur: 'מאימתי' },
      ],
    });
    getTosafotForDaf.mockResolvedValue([
      { hebrew: 'פירוש תוספות', dibbur: 'מאימתי' },
    ]);
    getMaharshaForDaf.mockResolvedValue({
      halachot: [],
      aggadot: [],
    });
  });

  afterEach(() => {
    // Restore console.error after each test
    console.error = originalConsoleError;
  });

  describe('rendering', () => {
    it('should show loading state initially', async () => {
      // Use a never-resolving promise to keep loading state
      getRashiOnTalmud.mockImplementation(() => new Promise(() => {}));
      getTosafotForDaf.mockImplementation(() => new Promise(() => {}));
      getMaharshaForDaf.mockImplementation(() => new Promise(() => {}));

      render(<TzuratHaDaf {...defaultProps} />);

      // Component should show loading message while data is loading
      // Use queryAllByText as there may be multiple loading elements
      const loadingElements = screen.queryAllByText(/טוען|Loading|מתחבר/i);
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('should display loading progress indicator', () => {
      render(<TzuratHaDaf {...defaultProps} />);

      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
    });

    it('should show Hebrew tractate name in loading state', () => {
      render(<TzuratHaDaf {...defaultProps} />);

      expect(screen.getByText('ברכות')).toBeInTheDocument();
    });

    it('should show daf number in loading state', () => {
      render(<TzuratHaDaf {...defaultProps} />);

      expect(screen.getByText('דף 2a')).toBeInTheDocument();
    });

    it('should render content after loading', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('גמרא')).toBeInTheDocument();
      });
    });

    it('should render Gemara column', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('גמרא')).toBeInTheDocument();
      });
    });

    it('should render Rashi column by default (Oz VeHadar style)', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        // Look for Rashi column header specifically
        const rashiCol = document.querySelector('.daf-rashi-col');
        expect(rashiCol).toBeInTheDocument();
      });
    });

    it('should render Tosafot column by default (Oz VeHadar style)', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('תוספות')).toBeInTheDocument();
      });
    });

    it('should show empty verse state when no verses', async () => {
      render(<TzuratHaDaf {...defaultProps} verses={[]} />);

      // Should remain in loading state waiting for verses
      expect(screen.getByText(/טוען|Loading|מתחבר/i)).toBeInTheDocument();
    });
  });

  describe('layout styles', () => {
    it('should apply ozvehadar class by default', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        const container = document.querySelector('.tzurat-hadaf');
        expect(container).toHaveClass('oz-vehadar-theme');
      });
    });

    it('should show style selector button', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('עוז והדר')).toBeInTheDocument();
      });
    });

    it('should open style menu when clicked', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('עוז והדר'));
      });

      expect(screen.getByText('וילנא')).toBeInTheDocument();
      expect(screen.getByText('פשוט')).toBeInTheDocument();
    });
  });

  describe('column toggles', () => {
    it('should render Rashi toggle button', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        // Look for filter button specifically
        const filterBtns = document.querySelectorAll('.daf-column-filters .filter-btn');
        expect(filterBtns.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should render Tosafot toggle button', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('תוס׳')).toBeInTheDocument();
      });
    });
  });

  describe('zoom controls', () => {
    it('should render zoom in button', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Zoom in')).toBeInTheDocument();
      });
    });

    it('should render zoom out button', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Zoom out')).toBeInTheDocument();
      });
    });
  });

  describe('translation toggle', () => {
    it('should render translation toggle button', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        const translateBtn = screen.getByTitle(/translation/i);
        expect(translateBtn).toBeInTheDocument();
      });
    });
  });

  describe('fullscreen toggle', () => {
    it('should render fullscreen button', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Fullscreen')).toBeInTheDocument();
      });
    });
  });

  describe('settings panel', () => {
    it('should render settings button', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Settings (S)')).toBeInTheDocument();
      });
    });

    it('should open settings panel when button clicked', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        fireEvent.click(screen.getByTitle('Settings (S)'));
      });

      expect(screen.getByText('הגדרות תצוגה')).toBeInTheDocument();
    });

    it('should show diacritic settings in panel', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        fireEvent.click(screen.getByTitle('Settings (S)'));
      });

      expect(screen.getByText('ניקוד וטעמים')).toBeInTheDocument();
      // Check settings panel exists - may have Hebrew text with multiple matches
      const settingsPanel = document.querySelector('.daf-settings-panel');
      expect(settingsPanel).toBeInTheDocument();
    });

    it('should show keyboard shortcuts in settings', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        fireEvent.click(screen.getByTitle('Settings (S)'));
      });

      expect(screen.getByText('קיצורי מקלדת')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should render prev navigation button when callback provided', async () => {
      const onPrevChapter = jest.fn();
      render(<TzuratHaDaf {...defaultProps} onPrevChapter={onPrevChapter} />);

      await waitFor(() => {
        expect(screen.getByTitle('Previous (Ctrl+←)')).toBeInTheDocument();
      });
    });

    it('should render next navigation button when callback provided', async () => {
      const onNextChapter = jest.fn();
      render(<TzuratHaDaf {...defaultProps} onNextChapter={onNextChapter} />);

      await waitFor(() => {
        expect(screen.getByTitle('Next (Ctrl+→)')).toBeInTheDocument();
      });
    });

    it('should call onPrevChapter when prev button clicked', async () => {
      const onPrevChapter = jest.fn();
      render(<TzuratHaDaf {...defaultProps} onPrevChapter={onPrevChapter} />);

      await waitFor(() => {
        fireEvent.click(screen.getByTitle('Previous (Ctrl+←)'));
      });

      expect(onPrevChapter).toHaveBeenCalledTimes(1);
    });

    it('should call onNextChapter when next button clicked', async () => {
      const onNextChapter = jest.fn();
      render(<TzuratHaDaf {...defaultProps} onNextChapter={onNextChapter} />);

      await waitFor(() => {
        fireEvent.click(screen.getByTitle('Next (Ctrl+→)'));
      });

      expect(onNextChapter).toHaveBeenCalledTimes(1);
    });

    it('should disable prev button when hasPrevChapter is false', async () => {
      const onPrevChapter = jest.fn();
      render(<TzuratHaDaf {...defaultProps} onPrevChapter={onPrevChapter} hasPrevChapter={false} />);

      await waitFor(() => {
        const prevBtn = screen.getByTitle('Previous (Ctrl+←)');
        expect(prevBtn).toBeDisabled();
      });
    });

    it('should disable next button when hasNextChapter is false', async () => {
      const onNextChapter = jest.fn();
      render(<TzuratHaDaf {...defaultProps} onNextChapter={onNextChapter} hasNextChapter={false} />);

      await waitFor(() => {
        const nextBtn = screen.getByTitle('Next (Ctrl+→)');
        expect(nextBtn).toBeDisabled();
      });
    });
  });

  describe('close button', () => {
    it('should render close button when onClose provided', async () => {
      const onClose = jest.fn();
      render(<TzuratHaDaf {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByTitle('Close')).toBeInTheDocument();
      });
    });

    it('should call onClose when close button clicked', async () => {
      const onClose = jest.fn();
      render(<TzuratHaDaf {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        fireEvent.click(screen.getByTitle('Close'));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not render close button when no onClose', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByTitle('Close')).not.toBeInTheDocument();
      });
    });
  });

  describe('commentary loading', () => {
    it('should load Rashi commentary', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(getRashiOnTalmud).toHaveBeenCalledWith('Berakhot', '2a');
      });
    });

    it('should load Tosafot commentary', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(getTosafotForDaf).toHaveBeenCalledWith('Berakhot', '2a');
      });
    });

    it('should load Maharsha commentary', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(getMaharshaForDaf).toHaveBeenCalledWith('Berakhot', '2a');
      });
    });

    it('should handle commentary load errors gracefully', async () => {
      getRashiOnTalmud.mockRejectedValue(new Error('Network error'));
      getTosafotForDaf.mockRejectedValue(new Error('Network error'));

      render(<TzuratHaDaf {...defaultProps} />);

      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('גמרא')).toBeInTheDocument();
      });
    });

    it('should show empty message when no Rashi available', async () => {
      getRashiOnTalmud.mockResolvedValue({ comments: [] });

      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('אין רש״י לדף זה')).toBeInTheDocument();
      });
    });

    it('should show empty message when no Tosafot available', async () => {
      getTosafotForDaf.mockResolvedValue([]);

      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('אין תוספות לדף זה')).toBeInTheDocument();
      });
    });
  });

  describe('page header and footer', () => {
    it('should display tractate name in header', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        const masechetElements = screen.getAllByText('ברכות');
        expect(masechetElements.length).toBeGreaterThan(0);
      });
    });

    it('should display daf number in header', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('2a')).toBeInTheDocument();
      });
    });

    it('should display תלמוד בבלי header', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        const talmudHeaders = screen.getAllByText('תלמוד בבלי');
        expect(talmudHeaders.length).toBeGreaterThan(0);
      });
    });
  });

  describe('discourse markers', () => {
    it('should render discourse toggle button', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('סימנים')).toBeInTheDocument();
      });
    });
  });

  describe('Hebrew tractate mapping', () => {
    const tractateTests = [
      { english: 'Berakhot', hebrew: 'ברכות' },
      { english: 'Shabbat', hebrew: 'שבת' },
      { english: 'Pesachim', hebrew: 'פסחים' },
      { english: 'Sanhedrin', hebrew: 'סנהדרין' },
      { english: 'Bava Kamma', hebrew: 'בבא קמא' },
    ];

    tractateTests.forEach(({ english, hebrew }) => {
      it(`should map ${english} to ${hebrew}`, async () => {
        render(<TzuratHaDaf {...defaultProps} selectedBook={english} />);

        await waitFor(() => {
          const hebrewElements = screen.getAllByText(hebrew);
          expect(hebrewElements.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('accessibility', () => {
    it('should have aria-labels on control buttons', async () => {
      render(<TzuratHaDaf {...defaultProps} onClose={() => {}} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
        expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
        expect(screen.getByLabelText(/Fullscreen/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Close/i)).toBeInTheDocument();
      });
    });

    it('should have proper lang attributes on Hebrew content', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        const hebrewElements = document.querySelectorAll('[lang="he"]');
        expect(hebrewElements.length).toBeGreaterThan(0);
      });
    });

    it('should have proper dir attributes for RTL', async () => {
      render(<TzuratHaDaf {...defaultProps} />);

      await waitFor(() => {
        const rtlElements = document.querySelectorAll('[dir="rtl"]');
        expect(rtlElements.length).toBeGreaterThan(0);
      });
    });
  });
});
