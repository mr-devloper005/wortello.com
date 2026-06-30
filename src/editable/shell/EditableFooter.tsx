'use client'

import Link from 'next/link'
import { SITE_CONFIG } from '@/lib/site-config'
import { globalContent } from '@/editable/content/global.content'
import { useEditableLocalAuthSession } from '@/editable/components/EditableLocalAuthForms'

export function EditableFooter() {
  const year = new Date().getFullYear()
  const { session, logout } = useEditableLocalAuthSession()

  return (
    <footer className="bg-[#1A0A2E] text-white">
      <div className="mx-auto max-w-[var(--editable-container)] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">

          {/* Brand column */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#B331F1]/40 bg-[#B331F1]/20">
                <img src="/favicon.png?v=20260413" alt={SITE_CONFIG.name} className="h-6 w-6 object-contain" />
              </span>
              <span className="text-[17px] font-extrabold text-white">{SITE_CONFIG.name}</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-7 text-white/50">
              {globalContent.footer?.description || SITE_CONFIG.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center rounded-full bg-[#B331F1] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#9B28D4]"
              >
                Contact us
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Sign up
              </Link>
            </div>
          </div>

          {/* Resources column */}
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#FF62BB]">Resources</h3>
            <div className="mt-5 grid gap-3">
              {[
                ['About', '/about'],
                ['Search', '/search'],
                ['Blog', '/articles'],
              ].map(([label, href]) => (
                <Link key={href} href={href} className="text-sm font-semibold text-white/55 transition hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Company column */}
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#FF97D0]">Company</h3>
            <div className="mt-5 grid gap-3">
              {[
                ['Contact', '/contact'],
                ...(session ? [['Create post', '/create']] : [['Login', '/login'], ['Sign up', '/signup']]),
              ].map(([label, href]) => (
                <Link key={href} href={href} className="text-sm font-semibold text-white/55 transition hover:text-white">
                  {label}
                </Link>
              ))}
              {session && (
                <button
                  type="button"
                  onClick={logout}
                  className="text-left text-sm font-semibold text-white/55 transition hover:text-white"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8 px-4 py-5">
        <div className="mx-auto flex max-w-[var(--editable-container)] flex-wrap items-center justify-between gap-4 text-xs font-semibold text-white/30">
          <span>© {year} {SITE_CONFIG.name}. All rights reserved.</span>
          <div className="flex gap-5">
            <Link href="/about" className="hover:text-white/60 transition">About</Link>
            <Link href="/contact" className="hover:text-white/60 transition">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
