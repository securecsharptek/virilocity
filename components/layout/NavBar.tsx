'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — NavBar  ·  WCAG 2.2 compliant
// WCAG: 2.1.1 Keyboard, 2.4.3 Focus Order, 2.4.7 Focus Visible,
//       4.1.2 Name/Role/Value, 2.4.2 Page Titled (title in layout)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

const NAV_LINKS = [
  { href: '#b2c-section',  label: 'For Individuals' },
  { href: '#b2b-section',  label: 'For Teams' },
  { href: '#features-heading', label: 'Features' },
  { href: '/docs',         label: 'Docs' },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef  = useRef<HTMLUListElement>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);

  // WCAG 2.1.1: close menu on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        btnRef.current?.focus(); // return focus to trigger
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [menuOpen]);

  return (
    // WCAG 1.3.1: <header> landmark
    <header className="sticky top-0 z-40 bg-navy border-b border-white/10" role="banner">
      <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between gap-4">

        {/* Logo — WCAG 1.1.1: meaningful alt via aria-label */}
        <a
          href="/"
          className="shrink-0"
          aria-label="Virilocity — Go to homepage"
        >
          <span
            className="relative flex items-center overflow-hidden rounded-xl border border-white/12 bg-white/5 shadow-[0_0_30px_rgba(14,200,198,0.18)] ring-1 ring-white/8"
            style={{ width: '320px', height: '68px' }}
          >
            <Image
              src="/assets/logos/VirilocityLogo.png"
              alt="Virilocity"
              fill
              priority
              sizes="320px"
              className="object-cover object-center"
            />
          </span>
        </a>

        {/* Desktop nav — WCAG 1.3.1: <nav> landmark with aria-label */}
        <nav aria-label="Main navigation" className="hidden md:block">
          <ul className="flex gap-6 list-none p-0 m-0">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  className="text-slate-300 hover:text-white text-sm font-medium transition-colors"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* CTA + Mobile toggle */}
        <div className="flex items-center gap-3">
          {/* <a
            href="/auth/login"
            className="hidden md:inline-flex text-slate-300 hover:text-white text-sm font-medium"
          >
            Sign In
          </a> */}
          <a
            href="/auth/signup"
            className="btn btn-secondary text-sm px-4 py-2"
            aria-label="Get started — create your free account"
          >
            Get Started
          </a>

          {/* WCAG 4.1.2: Mobile menu button with aria-expanded, aria-controls */}
          <button
            ref={btnRef}
            className="md:hidden btn p-2 text-white"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen(o => !o)}
          >
            {/* WCAG 1.1.1: icon described by button label */}
            <span aria-hidden="true" className="text-xl">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* Mobile menu — WCAG 2.4.3: focus order follows DOM */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Mobile navigation"
          className="md:hidden bg-navy border-t border-white/10"
        >
          <ul ref={menuRef} className="list-none p-4 flex flex-col gap-2">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <a
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 px-4 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  {label}
                </a>
              </li>
            ))}
            <li className="border-t border-white/10 pt-3 mt-1">
              <a href="/auth/login" className="block py-3 px-4 text-slate-200">Sign In</a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
