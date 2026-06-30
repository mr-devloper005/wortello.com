'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Search, UserPlus, LogIn, X, PlusCircle } from 'lucide-react'
import { SITE_CONFIG } from '@/lib/site-config'
import { globalContent } from '@/editable/content/global.content'
import { useEditableLocalAuthSession } from '@/editable/components/EditableLocalAuthForms'

export function EditableNavbar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { session, logout } = useEditableLocalAuthSession()
  const navItems = useMemo(() => [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Search', href: '/search' },
  ], [])

  return (
    <header className="sticky top-0 z-50 bg-[#1A0A2E] text-white">
      <nav className="mx-auto flex min-h-[68px] w-full max-w-[var(--editable-container)] items-center gap-4 px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B331F1]/20 border border-[#B331F1]/40 transition group-hover:bg-[#B331F1]/30 group-hover:border-[#B331F1]/60">
            <img src="/favicon.png?v=20260413" alt={SITE_CONFIG.name} className="h-6 w-6 object-contain" />
          </span>
          <span className="text-[17px] font-extrabold tracking-tight text-white">{SITE_CONFIG.name}</span>
        </Link>

        {/* Centered pill navigation */}
        <div className="hidden flex-1 items-center justify-center lg:flex">
          <div className="flex items-center gap-0.5 rounded-full border border-white/12 bg-white/6 px-1.5 py-1.5 backdrop-blur-sm">
            {navItems.slice(0, 5).map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition duration-200 ${
                    active
                      ? 'bg-[#B331F1] text-white shadow-[0_2px_8px_rgba(179,49,241,0.4)]'
                      : 'text-white/65 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right side */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* Inline search */}
          <form action="/search" className="hidden md:flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 transition focus-within:border-[#B331F1]/50 focus-within:bg-white/10">
            <Search className="h-4 w-4 shrink-0 text-white/50" />
            <input
              name="q"
              type="search"
              placeholder="Search..."
              className="w-28 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
          </form>

          {session ? (
            <>
              <Link
                href="/create"
                className="hidden items-center gap-1.5 rounded-full bg-[#B331F1] px-5 py-2 text-[13px] font-bold text-white transition hover:bg-[#9B28D4] sm:inline-flex"
              >
                <PlusCircle className="h-4 w-4" /> Create
              </Link>
              <button
                type="button"
                onClick={logout}
                className="hidden text-[13px] font-semibold text-white/55 transition hover:text-white sm:block"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden items-center gap-1.5 text-[13px] font-semibold text-white/65 transition hover:text-white sm:inline-flex"
              >
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
              <Link
                href="/signup"
                className="hidden items-center gap-1.5 rounded-full bg-[#B331F1] px-5 py-2 text-[13px] font-bold text-white transition hover:bg-[#9B28D4] sm:inline-flex"
              >
                <UserPlus className="h-4 w-4" /> Get started
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-xl border border-white/15 bg-white/8 p-2 transition hover:bg-white/12 lg:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open ? (
        <div className="border-t border-white/8 bg-[#1A0A2E] px-4 py-5 lg:hidden">
          <form action="/search" className="mb-4 flex items-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-4 py-2.5">
            <Search className="h-4 w-4 text-white/50" />
            <input
              name="q"
              type="search"
              placeholder="Search..."
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
          </form>
          <div className="grid gap-1">
            {[
              ...navItems,
              ...(session
                ? [{ label: 'Create', href: '/create' }]
                : [{ label: 'Login', href: '/login' }, { label: 'Sign up', href: '/signup' }]),
            ].map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                    active
                      ? 'bg-[#B331F1] text-white'
                      : 'text-white/65 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            {session && (
              <button
                type="button"
                onClick={() => { logout(); setOpen(false) }}
                className="rounded-xl px-4 py-3 text-left text-sm font-bold text-white/50 hover:bg-white/8 hover:text-white transition"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}
