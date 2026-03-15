import { useReducer, useEffect, useLayoutEffect, useCallback } from 'react';

const KEY = 'darkMode';
const DARK = 'dark-mode';
const TRANSITION = 'theme-transition';
const query = () => window.matchMedia('(prefers-color-scheme: dark)');
const stored = () => localStorage.getItem(KEY);
const meta = () => document.querySelector('meta[name="color-scheme"]')
  || Object.assign(document.createElement('meta'), { name: 'color-scheme' });

const init = () => {
  const saved = stored();
  if (saved === 'auto') return { dark: query().matches, auto: true };
  if (saved !== null) return { dark: JSON.parse(saved), auto: false };
  return { dark: query().matches, auto: true };
};

const reducer = (state, action) => {
  switch (action) {
    case 'toggle': return { dark: !state.dark, auto: false };
    case 'light':  return { dark: false, auto: false };
    case 'dark':   return { dark: true, auto: false };
    case 'system': return { dark: query().matches, auto: true };
    default:       return { dark: Boolean(action), auto: false };
  }
};

const useDarkMode = () => {
  const [{ dark, auto }, dispatch] = useReducer(reducer, null, init);

  useLayoutEffect(() => {
    const { body } = document;
    const m = meta();

    body.classList.add(TRANSITION);
    body.classList.toggle(DARK, dark);
    m.content = dark ? 'dark' : 'light';
    if (!m.parentNode) document.head.appendChild(m);

    localStorage.setItem(KEY, auto ? 'auto' : dark);

    const id = setTimeout(() => body.classList.remove(TRANSITION), 300);
    return () => clearTimeout(id);
  }, [dark, auto]);

  useEffect(() => {
    if (!auto) return;
    const mq = query();
    const sync = (e) => dispatch(e.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [auto]);

  useEffect(() => {
    const sync = (e) => {
      if (e.key !== KEY || e.storageArea !== localStorage) return;
      const val = e.newValue;
      if (val === 'auto') dispatch('system');
      else if (val !== null) dispatch(JSON.parse(val));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const set = useCallback((mode) => dispatch(mode), []);

  return { dark, auto, set };
};

export default useDarkMode;
