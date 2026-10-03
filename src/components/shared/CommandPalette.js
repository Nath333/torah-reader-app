import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  TORAH_BOOKS,
  NEVIIM_BOOKS,
  TANACH_BOOKS,
  TALMUD_BAVLI,
  MISHNAH_SEDARIM,
  BOOK_HEBREW_NAMES
} from '../../constants/bookConstants';
import './CommandPalette.css';

/**
 * CommandPalette — navigation clavier rapide (Ctrl+P / ⌘P).
 *
 * Complémentaire de SmartSearch (Ctrl+K, recherche de versets) : ici on
 * saute à un sefer/massechet, on ouvre une vue ou on déclenche une action.
 * Filtrage insensible à la casse sur les noms anglais ET hébreux.
 */

const TORAH_SET = new Set(TORAH_BOOKS);
const NEVIIM_SET = new Set(NEVIIM_BOOKS);

const VIEWS = [
  { id: 'view:bookmarks', type: 'Vue', label: 'Bookmarks — favoris', run: 'view', value: 'bookmarks' },
  { id: 'view:history', type: 'Vue', label: 'History — historique de lecture', run: 'view', value: 'history' },
  { id: 'view:vocabulary', type: 'Vue', label: 'Vocabulary — vocabulaire appris', run: 'view', value: 'vocabulary' },
  { id: 'view:discover', type: 'Vue', label: 'Discover — découvrir', run: 'view', value: 'discover' },
  { id: 'view:versions', type: 'Vue', label: 'Versions — traductions et manuscrits', run: 'view', value: 'versions' },
  { id: 'view:study', type: 'Vue', label: 'Study — espace étude', run: 'view', value: 'study' },
  { id: 'view:traditional', type: 'Vue', label: 'Tzurat HaDaf — page traditionnelle', run: 'view', value: 'traditional' }
];

const ACTIONS = [
  { id: 'action:dark', type: 'Action', label: 'Basculer thème sombre / clair', run: 'dark' },
  { id: 'action:focus', type: 'Action', label: 'Mode Focus (plein texte)', run: 'focus' },
  { id: 'action:search', type: 'Action', label: 'Smart Search — chercher des versets (Ctrl+K)', run: 'search' }
];

const normalize = (s) => (s || '').toLowerCase().replace(/[_'’]/g, ' ').trim();

const buildCommands = () => {
  const cmds = [];

  TANACH_BOOKS.forEach((book) => {
    const cat = TORAH_SET.has(book) ? 'Torah' : NEVIIM_SET.has(book) ? 'Navi' : 'Ketuvim';
    cmds.push({
      id: `book:${book}`,
      type: cat,
      label: BOOK_HEBREW_NAMES[book] ? `${BOOK_HEBREW_NAMES[book]} · ${book}` : book,
      search: normalize(`${book} ${BOOK_HEBREW_NAMES[book] || ''}`),
      run: 'book',
      value: book
    });
  });

  TALMUD_BAVLI.forEach((t) => {
    cmds.push({
      id: `talmud:${t}`,
      type: 'Gemara',
      label: t,
      search: normalize(`${t} massechet talmud`),
      run: 'book',
      value: t
    });
  });

  Object.values(MISHNAH_SEDARIM).forEach((seder) => {
    (seder.tractates || []).forEach((t) => {
      cmds.push({
        id: `mishnah:${t}`,
        type: 'Mishnah',
        label: t,
        search: normalize(`${t} ${seder.name} mishna`),
        run: 'book',
        value: t
      });
    });
  });

  VIEWS.forEach((v) => cmds.push({ ...v, search: normalize(`${v.label} ${v.type}`) }));
  ACTIONS.forEach((a) => cmds.push({ ...a, search: normalize(`${a.label} ${a.type}`) }));

  return cmds;
};

const CommandPalette = ({
  open,
  onClose,
  onGoToBook,
  onToggleView,
  onToggleDark,
  onOpenFocus,
  onOpenSmartSearch
}) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const commands = useMemo(buildCommands, []);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return commands.slice(0, 14);
    const scored = [];
    for (const c of commands) {
      const idx = c.search.indexOf(q);
      if (idx === -1) continue;
      scored.push({ c, score: idx }); // plus tôt = plus pertinent
    }
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 14).map((s) => s.c);
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Laisser le montage peindre avant de focaliser
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const run = (cmd) => {
    if (!cmd) return;
    onClose();
    switch (cmd.run) {
      case 'book':
        onGoToBook(cmd.value);
        break;
      case 'view':
        onToggleView(cmd.value);
        break;
      case 'dark':
        onToggleDark();
        break;
      case 'focus':
        onOpenFocus();
        break;
      case 'search':
        onOpenSmartSearch();
        break;
      default:
        break;
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Garder l'élément actif visible
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, results]);

  if (!open) return null;

  return (
    <div className="cmdk-overlay" onMouseDown={onClose} role="presentation">
      <div
        className="cmdk-panel"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
      >
        <input
          ref={inputRef}
          className="cmdk-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Aller à un sefer, une vue, une action…"
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-activedescendant={results[active] ? `cmdk-opt-${active}` : undefined}
          autoComplete="off"
          spellCheck="false"
        />
        <ul className="cmdk-list" id="cmdk-list" ref={listRef} role="listbox">
          {results.length === 0 && (
            <li className="cmdk-empty" role="option" aria-selected="false">
              Aucun résultat — « {query} »
            </li>
          )}
          {results.map((cmd, i) => (
            <li
              key={cmd.id}
              id={`cmdk-opt-${i}`}
              role="option"
              aria-selected={i === active}
              data-active={i === active || undefined}
              className="cmdk-item"
              onMouseEnter={() => setActive(i)}
              onClick={() => run(cmd)}
            >
              <span className={`cmdk-type cmdk-type-${cmd.type.replace(/[^a-z]/gi, '').toLowerCase()}`}>
                {cmd.type}
              </span>
              <span className="cmdk-label">{cmd.label}</span>
              <kbd className="cmdk-enter" aria-hidden="true">↵</kbd>
            </li>
          ))}
        </ul>
        <div className="cmdk-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span>
          <span><kbd>↵</kbd> ouvrir</span>
          <span><kbd>esc</kbd> fermer</span>
        </div>
      </div>
    </div>
  );
};

CommandPalette.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onGoToBook: PropTypes.func.isRequired,
  onToggleView: PropTypes.func.isRequired,
  onToggleDark: PropTypes.func.isRequired,
  onOpenFocus: PropTypes.func.isRequired,
  onOpenSmartSearch: PropTypes.func.isRequired
};

export default CommandPalette;
