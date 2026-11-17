// Theme switch: dark mode on or off, remembered across visits.
//
// Until the first click nothing is stored and the page follows the OS
// (prefers-color-scheme), and the switch shows which scheme that is. A click
// flips the scheme currently shown and stores it as localStorage.theme =
// 'light' | 'dark'; from then on the stored choice wins and clicks toggle it.
// The inline script in index.html's <head> applies a stored choice before
// first paint. Without JavaScript the switch stays hidden and the page
// follows the OS (tokens.css).
'use strict';

const root = document.documentElement;
const toggle = document.querySelector('.theme-switch');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

const current = () => root.dataset.theme ?? (prefersDark.matches ? 'dark' : 'light');
const sync = () => toggle.setAttribute('aria-checked', String(current() === 'dark'));

if (toggle) {
  toggle.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Storage blocked (private mode, site data off): the choice lasts for this page view.
    }
    sync();
  });
  prefersDark.addEventListener('change', sync); // still on auto: follow the OS live
  sync();
  toggle.hidden = false;
}
