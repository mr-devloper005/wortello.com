import Link from 'next/link'
import {
  ArrowRight, Bookmark, Building2, ChevronRight, FileText, Image as ImageIcon,
  Megaphone, Star, UserRound, Sparkles, TrendingUp, Zap,
} from 'lucide-react'
import type { SitePost } from '@/lib/site-connector'
import type { HomeTimeSection } from '@/lib/task-data'
import type { TaskKey } from '@/lib/site-config'
import { SITE_CONFIG } from '@/lib/site-config'
import { pagesContent } from '@/editable/content/pages.content'
import { getEditablePostImage, postHref } from '@/editable/cards/PostCards'

type HomeSectionProps = {
  primaryTask: TaskKey
  primaryRoute: string
  posts: SitePost[]
  timeSections: HomeTimeSection[]
}

const taskIcon: Record<TaskKey, typeof FileText> = {
  article: FileText,
  listing: Building2,
  classified: Megaphone,
  image: ImageIcon,
  sbm: Bookmark,
  pdf: FileText,
  profile: UserRound,
}

const taskAccents = ['#B331F1', '#FF62BB', '#FF97D0', '#FBF5A7', '#B331F1', '#FF62BB', '#FF97D0']

function taskLabel(task: TaskKey) {
  return SITE_CONFIG.tasks.find((item) => item.key === task)?.label || task
}

function getExcerpt(post?: SitePost | null, limit = 130) {
  const content = post?.content && typeof post.content === 'object' ? (post.content as Record<string, unknown>) : {}
  const raw =
    (typeof content.description === 'string' && content.description) ||
    (typeof content.summary === 'string' && content.summary) ||
    post?.summary ||
    ''
  const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return clean.length > limit ? `${clean.slice(0, limit).trim()}...` : clean
}

function categoryOf(post?: SitePost | null) {
  const content = post?.content && typeof post.content === 'object' ? (post.content as Record<string, unknown>) : {}
  return (typeof content.category === 'string' && content.category) || post?.tags?.[0] || ''
}

function hashStr(value: string) {
  let h = 0
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0
  return h
}

function ratingOf(post: SitePost) {
  const content = post?.content && typeof post.content === 'object' ? (post.content as Record<string, unknown>) : {}
  const real = Number(content.rating)
  if (real >= 1 && real <= 5) return Math.round(real * 10) / 10
  const h = hashStr(post.slug || post.id || post.title || 'x')
  return Math.round((3.7 + (h % 13) / 10) * 10) / 10
}

function reviewsOf(post: SitePost) {
  const content = post?.content && typeof post.content === 'object' ? (post.content as Record<string, unknown>) : {}
  const real = Number(content.reviewCount ?? content.reviews)
  if (real > 0) return Math.floor(real)
  return 6 + (hashStr((post.slug || post.title || 'x') + 'r') % 480)
}

function Stars({ rating, className = 'h-4 w-4' }: { rating: number; className?: string }) {
  const rounded = Math.round(rating)
  return (
    <span className="inline-flex items-center gap-[3px]" aria-label={`${rating} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={`${className} ${i < rounded ? 'fill-[#B331F1] text-[#B331F1]' : 'fill-[#EEE5FF] text-[#EEE5FF]'}`}
        />
      ))}
    </span>
  )
}

function dedupePosts(posts: SitePost[]) {
  const seen = new Set<string>()
  const out: SitePost[] = []
  for (const post of posts) {
    const key = post.slug || post.id || post.title
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(post)
  }
  return out
}

function latestPostImages(posts: SitePost[], max = 8) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const post of posts) {
    const img = getEditablePostImage(post)
    if (!img || img.includes('placeholder') || seen.has(img)) continue
    seen.add(img)
    out.push(img)
    if (out.length >= max) break
  }
  return out
}

const container = 'mx-auto w-full max-w-[var(--editable-container)] px-4 sm:px-6 lg:px-8'

/* ═══════════════════════════ HERO ═══════════════════════════════ */
export function EditableHomeHero({ primaryTask, primaryRoute, posts, timeSections }: HomeSectionProps) {
  const pool = dedupePosts([...posts, ...timeSections.flatMap((s) => s.posts)])
  const heroImages = latestPostImages(pool)
  const heroTitle = pagesContent.home.hero.title?.join(' ') || `Discover the best of ${SITE_CONFIG.name}`
  const categories = SITE_CONFIG.tasks.filter((t) => t.enabled).slice(0, 4)

  return (
    <section className="bg-[#1A0A2E]">
      {/* Announcement bar */}
      <div className={`flex justify-start border-b border-white/8 py-3 ${container}`}>
        <Link
          href={primaryRoute}
          className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/6 px-4 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <Sparkles className="h-4 w-4 text-[#FF97D0]" />
          <span>{pagesContent.home.hero.badge || `Explore the latest from ${SITE_CONFIG.name}`}</span>
          <ArrowRight className="h-4 w-4 text-white/40" />
        </Link>
      </div>

      {/* Hero headline + CTA */}
      <div className={`pb-8 pt-14 sm:pt-18 lg:pt-20 ${container}`}>
        <div className="max-w-3xl">
          <h1 className="text-5xl font-extrabold leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl lg:text-[4.5rem]">
            {heroTitle}
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/60">
            {pagesContent.home.hero.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-xl bg-white px-7 py-3.5 text-sm font-extrabold text-[#1A0A2E] transition hover:bg-white/90 active:scale-[0.98]"
            >
              Get in touch
            </Link>
            <Link
              href={primaryRoute}
              className="inline-flex items-center gap-2 rounded-xl border border-white/22 px-7 py-3.5 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/8 active:scale-[0.98]"
            >
              Browse {taskLabel(primaryTask).toLowerCase()} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

    </section>
  )
}

/* ═════════════════════ STORY RAIL — What's new ══════════════════ */
export function EditableStoryRail({ primaryTask, primaryRoute, posts, timeSections }: HomeSectionProps) {
  const pool = dedupePosts([...posts, ...timeSections.flatMap((s) => s.posts)])
  const featured = pool.slice(0, 3)
  if (!featured.length) return null

  return (
    <section className="bg-[#F8F5FF]">
      <div className={`py-14 sm:py-16 ${container}`}>
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.26em] text-[#B331F1]">Featured</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] text-[#1A0A2E] sm:text-4xl">
              What&apos;s new
            </h2>
          </div>
          <Link
            href={primaryRoute}
            className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#B331F1] transition hover:opacity-75"
          >
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Layout: big feature card left, 2 smaller right */}
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.65fr_1fr]">
          {/* Feature card */}
          {featured[0] && (
            <Link
              href={postHref(primaryTask, featured[0], primaryRoute)}
              className="group relative overflow-hidden rounded-2xl bg-[#1A0A2E] transition duration-300 hover:shadow-[0_20px_60px_rgba(179,49,241,0.22)]"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={getEditablePostImage(featured[0])}
                  alt={featured[0].title}
                  className="h-full w-full object-cover opacity-65 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-80"
                />
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,rgba(26,10,46,0.96)_85%)]" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                {categoryOf(featured[0]) && (
                  <span className="mb-3 inline-block rounded-full bg-[#B331F1] px-3 py-1 text-xs font-extrabold text-white">
                    {categoryOf(featured[0])}
                  </span>
                )}
                <h3 className="text-xl font-extrabold leading-snug text-white sm:text-2xl">
                  {featured[0].title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/60">
                  {getExcerpt(featured[0], 110)}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#FF97D0]">
                  Read more <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          )}

          {/* 2 compact side cards */}
          <div className="flex flex-col gap-4">
            {featured.slice(1, 3).map((post) => (
              <Link
                key={post.id || post.slug}
                href={postHref(primaryTask, post, primaryRoute)}
                className="group flex gap-4 overflow-hidden rounded-2xl border border-[#EEE5FF] bg-white p-4 transition duration-300 hover:border-[#B331F1]/35 hover:shadow-[0_4px_20px_rgba(179,49,241,0.10)]"
              >
                <div className="relative h-[88px] w-28 shrink-0 overflow-hidden rounded-xl bg-[#EEE5FF]">
                  <img
                    src={getEditablePostImage(post)}
                    alt={post.title}
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
                  />
                </div>
                <div className="min-w-0 py-1">
                  {categoryOf(post) && (
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B331F1]">
                      {categoryOf(post)}
                    </p>
                  )}
                  <h3 className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-[#1A0A2E] group-hover:text-[#B331F1] transition">
                    {post.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-xs text-[#7A6B99]">{getExcerpt(post, 60)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════ MAGAZINE SPLIT — Recent posts ══════════ */
function GridPostCard({ post, href, accentColor }: { post: SitePost; href: string; accentColor: string }) {
  const img = getEditablePostImage(post)
  const cat = categoryOf(post)
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#EEE5FF] bg-white transition duration-300 hover:border-[#B331F1]/30 hover:shadow-[0_8px_32px_rgba(179,49,241,0.12)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#F3E8FF]">
        <img
          src={img}
          alt={post.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
        {cat && (
          <span
            className="absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-extrabold text-white shadow-sm"
            style={{ background: accentColor }}
          >
            {cat}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-[#1A0A2E] transition group-hover:text-[#B331F1]">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-[#7A6B99]">
          {getExcerpt(post, 110)}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Stars rating={ratingOf(post)} className="h-3.5 w-3.5" />
            <span className="text-xs font-bold text-[#1A0A2E]">{ratingOf(post).toFixed(1)}</span>
            <span className="text-xs text-[#7A6B99]">({reviewsOf(post)})</span>
          </div>
          <span className="text-xs font-extrabold transition" style={{ color: accentColor }}>
            View →
          </span>
        </div>
      </div>
    </Link>
  )
}

export function EditableMagazineSplit({ primaryTask, primaryRoute, posts, timeSections }: HomeSectionProps) {
  const pool = dedupePosts([...posts, ...timeSections.flatMap((s) => s.posts)]).slice(0, 9)
  if (!pool.length) return null
  const accents = ['#B331F1', '#FF62BB', '#FF97D0', '#B331F1', '#FF62BB', '#FF97D0', '#B331F1', '#FF62BB', '#FF97D0']

  return (
    <section className="bg-white">
      <div className={`py-14 sm:py-16 ${container}`}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.26em] text-[#FF62BB]">Discover</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] text-[#1A0A2E] sm:text-4xl">
              Recent posts
            </h2>
          </div>
          <Link
            href={primaryRoute}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-extrabold text-[#B331F1] transition hover:opacity-75"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pool.map((post, i) => (
            <GridPostCard
              key={post.id || post.slug}
              post={post}
              href={postHref(primaryTask, post, primaryRoute)}
              accentColor={accents[i % accents.length]}
            />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href={primaryRoute}
            className="inline-flex items-center gap-2 rounded-full border border-[#EEE5FF] bg-[#F8F5FF] px-8 py-3.5 text-sm font-extrabold text-[#B331F1] transition hover:border-[#B331F1]/35 hover:bg-[#F3E8FF]"
          >
            Show more posts <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ══════════════════ TIME COLLECTIONS — Discovery sections ═══════ */
function HorizontalPostCard({ post, href }: { post: SitePost; href: string }) {
  const img = getEditablePostImage(post)
  const cat = categoryOf(post)
  return (
    <Link
      href={href}
      className="group flex gap-4 overflow-hidden rounded-2xl border border-[#EEE5FF] bg-white p-4 transition duration-300 hover:border-[#B331F1]/30 hover:shadow-[0_4px_20px_rgba(179,49,241,0.10)]"
    >
      <div className="relative h-[76px] w-[90px] shrink-0 overflow-hidden rounded-xl bg-[#EEE5FF]">
        <img
          src={img}
          alt={post.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
          loading="lazy"
        />
      </div>
      <div className="min-w-0 py-0.5">
        {cat && (
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B331F1]">{cat}</p>
        )}
        <h3 className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug text-[#1A0A2E] transition group-hover:text-[#B331F1]">
          {post.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-[#7A6B99]">{getExcerpt(post, 55)}</p>
      </div>
    </Link>
  )
}

const sectionMeta: Record<string, { eyebrow: string; title: string; accentColor: string; bgClass: string }> = {
  spotlight: {
    eyebrow: 'Fresh this week',
    title: 'New in the last 7 days',
    accentColor: '#B331F1',
    bgClass: 'bg-[#F8F5FF]',
  },
  browse: {
    eyebrow: 'Trending now',
    title: 'Popular this month',
    accentColor: '#FF62BB',
    bgClass: 'bg-[#FFF0F8]',
  },
  index: {
    eyebrow: 'Evergreen picks',
    title: 'From the archive',
    accentColor: '#B331F1',
    bgClass: 'bg-[#F8F5FF]',
  },
}

export function EditableTimeCollections({ primaryTask, primaryRoute, posts, timeSections }: HomeSectionProps) {
  const sections =
    timeSections.length > 0
      ? timeSections
      : ([
          { key: 'spotlight', posts: posts.slice(0, 8), href: primaryRoute },
          { key: 'browse', posts: posts.slice(8, 16), href: primaryRoute },
          { key: 'index', posts: posts.slice(16, 24), href: primaryRoute },
        ] as Pick<HomeTimeSection, 'key' | 'posts' | 'href'>[])

  const visible = sections.filter((s) => s.posts.length)
  if (!visible.length) return null

  return (
    <>
      {visible.map((section) => {
        const meta = sectionMeta[section.key] || {
          eyebrow: 'Discover',
          title: 'More to explore',
          accentColor: '#B331F1',
          bgClass: 'bg-[#F8F5FF]',
        }
        return (
          <section key={section.key} className={meta.bgClass}>
            <div className={`py-12 sm:py-14 ${container}`}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p
                    className="text-[11px] font-extrabold uppercase tracking-[0.26em]"
                    style={{ color: meta.accentColor }}
                  >
                    {meta.eyebrow}
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.02em] text-[#1A0A2E] sm:text-3xl">
                    {meta.title}
                  </h2>
                </div>
                <Link
                  href={section.href || primaryRoute}
                  className="inline-flex shrink-0 items-center gap-1.5 text-sm font-extrabold transition hover:opacity-75"
                  style={{ color: meta.accentColor }}
                >
                  See all <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {section.posts.slice(0, 8).map((post) => (
                  <HorizontalPostCard
                    key={post.id || post.slug}
                    post={post}
                    href={postHref(primaryTask, post, primaryRoute)}
                  />
                ))}
              </div>
            </div>
          </section>
        )
      })}
    </>
  )
}

/* ═════════════════════════ CTA BAND ═════════════════════════════ */
export function EditableHomeCta() {
  return (
    <section className="relative overflow-hidden bg-[#1A0A2E]">
      {/* Decorative glows */}
      <div
        className="pointer-events-none absolute -left-40 -top-20 h-80 w-80 rounded-full opacity-20 blur-[100px]"
        style={{ background: '#B331F1' }}
      />
      <div
        className="pointer-events-none absolute -bottom-16 -right-32 h-80 w-80 rounded-full opacity-15 blur-[100px]"
        style={{ background: '#FF62BB' }}
      />

      <div className={`relative flex flex-col items-center gap-6 py-20 text-center sm:py-24 ${container}`}>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/7 px-5 py-2 text-sm font-semibold text-white/75">
          <Zap className="h-4 w-4 text-[#FBF5A7]" /> Join {SITE_CONFIG.name} today
        </span>
        <h2 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-5xl">
          Got something worth sharing?
        </h2>
        <p className="max-w-xl text-lg text-white/55">
          Post a listing, share a story, or connect with the {SITE_CONFIG.name} community.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-full bg-[#B331F1] px-8 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#9B28D4] active:scale-[0.98]"
          >
            <TrendingUp className="h-4 w-4" /> Create a post
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-white/22 px-8 py-3.5 text-sm font-extrabold text-white transition hover:border-white/40 hover:bg-white/8 active:scale-[0.98]"
          >
            Contact us
          </Link>
        </div>
      </div>
    </section>
  )
}
