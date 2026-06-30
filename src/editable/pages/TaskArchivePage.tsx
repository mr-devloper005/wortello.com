import Link from 'next/link'
import { ArrowUpRight, BriefcaseBusiness, ChevronDown, ChevronLeft, Download, FileText, Globe, MapPin, Phone, Search, Star, UserRound } from 'lucide-react'
import { buildTaskMetadata } from '@/lib/seo'
import { CATEGORY_OPTIONS, normalizeCategory } from '@/lib/categories'
import { fetchPaginatedTaskPosts, buildPostUrl } from '@/lib/task-data'
import { getTaskConfig, type TaskKey } from '@/lib/site-config'
import type { SiteFeedPagination, SitePost } from '@/lib/site-connector'
import { taskPageMetadata } from '@/config/site.content'
import { taskPageVoices } from '@/editable/content/task-pages.content'
import { EditableSiteShell } from '@/editable/shell/EditableSiteShell'
import { getTaskTheme, taskThemeStyle } from '@/editable/theme/task-themes'
import { Ads } from '@/lib/ads'

export const revalidate = 3

export const taskMetadata = (task: TaskKey, path: string) =>
  buildTaskMetadata(task, {
    path,
    title: taskPageMetadata[task]?.title,
    description: taskPageMetadata[task]?.description,
  })

const getContent = (post: SitePost) =>
  post.content && typeof post.content === 'object' ? (post.content as Record<string, unknown>) : {}
const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const isUrl = (value: string) => value.startsWith('/') || /^https?:\/\//i.test(value)

const getImages = (post: SitePost) => {
  const content = getContent(post)
  const media = Array.isArray(post.media)
    ? post.media.map((item) => item?.url).filter((url): url is string => typeof url === 'string' && isUrl(url))
    : []
  const images = Array.isArray(content.images)
    ? content.images.filter((url): url is string => typeof url === 'string' && isUrl(url))
    : []
  const image = asText(content.image) || asText(content.featuredImage) || asText(content.thumbnail)
  const logo = asText(content.logo)
  return [
    ...media,
    ...images,
    ...(isUrl(image) ? [image] : []),
    ...(isUrl(logo) ? [logo] : []),
  ]
    .filter(Boolean)
    .slice(0, 8)
}

const placeholder = '/placeholder.svg?height=900&width=1200'
const getImage = (post: SitePost) => getImages(post)[0] || placeholder
const getCategory = (post: SitePost, fallback: string) =>
  asText(getContent(post).category) || post.tags?.[0] || fallback
const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const getSummary = (post: SitePost) =>
  stripHtml(
    post.summary ||
      asText(getContent(post).description) ||
      asText(getContent(post).excerpt) ||
      asText(getContent(post).body)
  )
const getField = (post: SitePost, keys: string[]) => {
  const content = getContent(post)
  for (const key of keys) {
    const value = asText(content[key])
    if (value) return value
  }
  return ''
}
const cleanDomain = (value: string) => value.replace(/^https?:\/\//, '').replace(/\/$/, '')

function pageHref(basePath: string, category: string, page: number) {
  const params = new URLSearchParams()
  if (category && category !== 'all') params.set('category', category)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

/* ── Grid layouts per task ─────────────────────────────────── */
const taskGrid: Record<TaskKey, string> = {
  article: 'grid gap-6 md:grid-cols-2 xl:grid-cols-3',
  listing: 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3',
  classified: 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3',
  image: 'columns-1 gap-5 [column-fill:_balance] sm:columns-2 xl:grid-cols-3',
  sbm: 'grid gap-5 md:grid-cols-2 xl:grid-cols-3',
  pdf: 'grid gap-5 md:grid-cols-2 xl:grid-cols-3',
  profile: 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
}

/* ── Ad slot per task (1 ad per page, different types) ──────── */
const taskAdSlot: Record<TaskKey, 'header' | 'in-feed' | 'footer' | 'article-bottom' | 'sidebar'> = {
  article: 'in-feed',
  listing: 'footer',
  profile: 'header',
  classified: 'article-bottom',
  image: 'in-feed',
  sbm: 'footer',
  pdf: 'article-bottom',
}

/* ── Shared homepage-style card base ────────────────────────── */
const cardBase =
  'group block overflow-hidden rounded-2xl border border-[#EEE5FF] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#B331F1]/30 hover:shadow-[0_8px_32px_rgba(179,49,241,0.12)]'

/* ── Routing helpers ─────────────────────────────────────────── */
export async function EditableTaskArchiveRoute({
  task,
  searchParams,
  basePath,
}: {
  task: TaskKey
  searchParams?: Promise<{ category?: string; page?: string }>
  basePath?: string
}) {
  const resolved = (await searchParams) || {}
  const page = Math.max(1, Math.floor(Number(resolved.page) || 1))
  const category = resolved.category ? normalizeCategory(resolved.category) : 'all'
  const taskConfig = getTaskConfig(task)
  const { posts, pagination } = await fetchPaginatedTaskPosts(task, { page, limit: 24, category })
  return (
    <TaskArchiveView
      task={task}
      posts={posts}
      pagination={pagination}
      category={category}
      basePath={basePath || taskConfig?.route || `/${task}`}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN ARCHIVE VIEW
═══════════════════════════════════════════════════════════════ */
export function TaskArchiveView({
  task,
  posts,
  pagination,
  category,
  basePath,
}: {
  task: TaskKey
  posts: SitePost[]
  pagination: SiteFeedPagination
  category: string
  basePath: string
}) {
  const taskConfig = getTaskConfig(task)
  const voice = taskPageVoices[task]
  const theme = getTaskTheme(task)
  const page = pagination.page || 1
  const label = taskConfig?.label || task
  const categoryLabel =
    category === 'all'
      ? 'All categories'
      : CATEGORY_OPTIONS.find((item) => item.slug === category)?.name || category
  const adSlot = taskAdSlot[task]

  return (
    <EditableSiteShell>
      <main className="min-h-screen bg-[#FBF5F7] text-[#1A0A2E]">

        {/* ── Dark hero header ─────────────────────────────── */}
        <header className="relative overflow-hidden bg-[#1A0A2E]">
          <div className="pointer-events-none absolute -left-40 -top-20 h-80 w-80 rounded-full bg-[#B331F1] opacity-15 blur-[100px]" />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-[#FF62BB] opacity-10 blur-[80px]" />

          <div className="relative mx-auto max-w-[var(--editable-container)] px-4 py-16 sm:py-20 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-white/50 transition hover:text-white/80"
            >
              <ChevronLeft className="h-4 w-4" /> Home
            </Link>

            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#B331F1]">
              <span>{theme.kicker}</span>
              <span className="h-1 w-1 rounded-full bg-[#B331F1] opacity-50" />
              <span className="text-white/45">{label}</span>
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
              {voice?.headline || `Browse ${label}`}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/55">
              {voice?.description || theme.note}
            </p>

            {voice?.chips?.length ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {voice.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-xs font-semibold text-white/70"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}

            {/* Filter bar */}
            <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/45">
                <span className="font-extrabold text-white">{posts.length}</span>{' '}
                {posts.length === 1 ? 'post' : 'posts'} · {categoryLabel}
              </p>
              <form action={basePath} className="flex items-center gap-2.5">
                <div className="relative">
                  <select
                    name="category"
                    defaultValue={category}
                    className="h-10 appearance-none rounded-full border border-white/20 bg-white/10 pl-4 pr-9 text-sm font-semibold text-white outline-none transition focus:border-[#B331F1]/60 focus:bg-white/15"
                    aria-label={voice?.filterLabel || 'Filter category'}
                  >
                    <option value="all" className="bg-[#1A0A2E] text-white">All categories</option>
                    {CATEGORY_OPTIONS.map((item) => (
                      <option key={item.slug} value={item.slug} className="bg-[#1A0A2E] text-white">
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                </div>
                <button className="inline-flex h-10 items-center rounded-full bg-[#B331F1] px-5 text-sm font-extrabold text-white transition hover:bg-[#9B28D4]">
                  Apply
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* ── Ad: placed at top for profile (header slot) ──── */}
        {adSlot === 'header' && (
          <div className="mx-auto max-w-6xl px-4 py-6">
            <Ads slot="header" showLabel eager className="mx-auto w-full" />
          </div>
        )}

        {/* ── Posts grid ───────────────────────────────────── */}
        <section className="mx-auto max-w-[var(--editable-container)] px-4 py-12 sm:py-16 sm:px-6 lg:px-8">
          {posts.length ? (
            <div className={taskGrid[task]}>
              {posts.map((post, index) => (
                <ArchivePostCard
                  key={post.id || post.slug}
                  post={post}
                  task={task}
                  basePath={basePath}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-[#EEE5FF] bg-white px-8 py-16 text-center">
              <Search className="mx-auto h-7 w-7 text-[#7A6B99]" />
              <h2 className="mt-5 text-2xl font-extrabold tracking-[-0.02em] text-[#1A0A2E]">
                Nothing here yet
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#7A6B99]">
                Try another category, or check back after new {label.toLowerCase()} are published.
              </p>
            </div>
          )}

          {/* ── Ad: in-feed after posts (article, image, sbm) */}
          {posts.length > 0 && adSlot === 'in-feed' && (
            <div className="mx-auto max-w-6xl px-4 py-8">
              <Ads slot="in-feed" showLabel eager className="mx-auto w-full" />
            </div>
          )}

          {/* ── Ad: article-bottom (classified, pdf) ───────── */}
          {posts.length > 0 && adSlot === 'article-bottom' && (
            <div className="mx-auto max-w-6xl px-4 py-8">
              <Ads slot="article-bottom" showLabel eager className="mx-auto w-full" />
            </div>
          )}

          {/* ── Pagination ─────────────────────────────────── */}
          {posts.length > 0 && (
            <nav className="mt-12 flex items-center justify-center gap-3 text-sm">
              {pagination.hasPrevPage ? (
                <Link
                  href={pageHref(basePath, category, page - 1)}
                  className="rounded-full border border-[#EEE5FF] bg-white px-5 py-2.5 font-bold text-[#1A0A2E] transition hover:border-[#B331F1]/40 hover:text-[#B331F1]"
                >
                  Previous
                </Link>
              ) : null}
              <span className="rounded-full border border-[#EEE5FF] bg-[#F3E8FF] px-5 py-2.5 font-extrabold text-[#B331F1]">
                Page {page} of {pagination.totalPages || 1}
              </span>
              {pagination.hasNextPage ? (
                <Link
                  href={pageHref(basePath, category, page + 1)}
                  className="rounded-full border border-[#EEE5FF] bg-white px-5 py-2.5 font-bold text-[#1A0A2E] transition hover:border-[#B331F1]/40 hover:text-[#B331F1]"
                >
                  Next
                </Link>
              ) : null}
            </nav>
          )}

          {/* ── Ad: footer slot (listing, sbm) after pagination */}
          {posts.length > 0 && adSlot === 'footer' && (
            <div className="mx-auto max-w-6xl px-4 py-8">
              <Ads slot="footer" showLabel eager className="mx-auto w-full" />
            </div>
          )}
        </section>
      </main>
    </EditableSiteShell>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CARD DISPATCHER
═══════════════════════════════════════════════════════════════ */
function ArchivePostCard({
  post,
  task,
  basePath,
  index,
}: {
  post: SitePost
  task: TaskKey
  basePath: string
  index: number
}) {
  const href = `${basePath}/${post.slug}` || buildPostUrl(task, post.slug)
  if (task === 'listing') return <ListingArchiveCard post={post} href={href} />
  if (task === 'classified') return <ClassifiedArchiveCard post={post} href={href} />
  if (task === 'image') return <ImageArchiveCard post={post} href={href} index={index} />
  if (task === 'sbm') return <BookmarkArchiveCard post={post} href={href} index={index} />
  if (task === 'pdf') return <PdfArchiveCard post={post} href={href} />
  if (task === 'profile') return <ProfileArchiveCard post={post} href={href} />
  return <ArticleArchiveCard post={post} href={href} index={index} />
}

/* ── Rating helpers ─────────────────────────────────────────── */
const hashStr = (value: string) => {
  let h = 0
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0
  return h
}
const ratingOf = (post: SitePost) => {
  const real = Number(getContent(post).rating)
  if (real >= 1 && real <= 5) return Math.round(real * 10) / 10
  return (
    Math.round((3.7 + (hashStr(post.slug || post.id || post.title || 'x') % 13) / 10) * 10) / 10
  )
}
const reviewsOf = (post: SitePost) => {
  const real = Number(getContent(post).reviewCount ?? getContent(post).reviews)
  if (real > 0) return Math.floor(real)
  return 6 + (hashStr((post.slug || post.title || 'x') + 'r') % 480)
}

function RatingLine({ post, center = false }: { post: SitePost; center?: boolean }) {
  const rating = ratingOf(post)
  const filled = Math.round(rating)
  return (
    <div className={`mt-2.5 flex items-center gap-2 ${center ? 'justify-center' : ''}`}>
      <span className="inline-flex items-center gap-[3px]">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < filled ? 'fill-[#B331F1] text-[#B331F1]' : 'fill-[#EEE5FF] text-[#EEE5FF]'}`}
          />
        ))}
      </span>
      <span className="text-xs font-bold text-[#1A0A2E]">{rating.toFixed(1)}</span>
      <span className="text-xs text-[#7A6B99]">({reviewsOf(post)})</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CARD COMPONENTS — homepage visual style
═══════════════════════════════════════════════════════════════ */

function ArticleArchiveCard({ post, href, index }: { post: SitePost; href: string; index: number }) {
  const image = getImage(post)
  const category = getCategory(post, 'Article')
  return (
    <Link href={href} className={cardBase}>
      <div className="relative aspect-[16/10] overflow-hidden bg-[#EEE5FF]">
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-[#B331F1] px-3 py-1 text-[11px] font-extrabold text-white shadow-sm">
          {category}
        </span>
      </div>
      <div className="p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A6B99]">
          No. {String(index + 1).padStart(2, '0')}
        </p>
        <h2 className="mt-2 line-clamp-2 text-[15px] font-extrabold leading-snug tracking-[-0.01em] text-[#1A0A2E] group-hover:text-[#B331F1] transition">
          {post.title}
        </h2>
        <RatingLine post={post} />
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#7A6B99]">{getSummary(post)}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-[#B331F1]">
          Read article <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  )
}

function ListingArchiveCard({ post, href }: { post: SitePost; href: string }) {
  const images = getImages(post)
  const logo = images[0]
  const cover = images[1] || images[0]
  const location = getField(post, ['location', 'address', 'city'])
  const phone = getField(post, ['phone', 'telephone', 'mobile'])
  const website = getField(post, ['website', 'url'])
  const category = getField(post, ['category']) || post.tags?.[0] || 'Business'
  return (
    <Link href={href} className="group flex flex-col overflow-hidden rounded-2xl border border-[#EEE5FF] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#B331F1]/30 hover:shadow-[0_8px_32px_rgba(179,49,241,0.12)]">
      {/* Cover image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-[#F3E8FF]">
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BriefcaseBusiness className="h-12 w-12 text-[#B331F1]/25" />
          </div>
        )}
        {/* Logo badge */}
        <div className="absolute bottom-3 left-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-white shadow-md">
          {logo ? (
            <img src={logo} alt="" className="h-full w-full object-cover" />
          ) : (
            <BriefcaseBusiness className="h-6 w-6 text-[#B331F1]" />
          )}
        </div>
        {/* Category badge */}
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#B331F1] backdrop-blur-sm">
          {category}
        </span>
      </div>
      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-[15px] font-extrabold leading-snug tracking-[-0.01em] text-[#1A0A2E] transition group-hover:text-[#B331F1]">
          {post.title}
        </h2>
        <RatingLine post={post} />
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#7A6B99]">{getSummary(post)}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[#EEE5FF] pt-4 text-xs font-semibold text-[#7A6B99]">
          {location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#B331F1]" /> {location}
            </span>
          )}
          {phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-[#B331F1]" /> {phone}
            </span>
          )}
          {website && (
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-[#B331F1]" /> Website
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function ClassifiedArchiveCard({ post, href }: { post: SitePost; href: string }) {
  const price = getField(post, ['price', 'amount', 'budget'])
  const location = getField(post, ['location', 'address', 'city'])
  const condition = getField(post, ['condition', 'type', 'availability'])
  return (
    <Link href={href} className={`${cardBase} flex flex-col p-5`}>
      <div className="flex items-start justify-between gap-4">
        <span className="text-2xl font-extrabold tracking-[-0.02em] text-[#B331F1]">
          {price || 'Open offer'}
        </span>
        {condition && (
          <span className="rounded-full bg-[#F3E8FF] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#B331F1]">
            {condition}
          </span>
        )}
      </div>
      <h2 className="mt-4 text-[15px] font-extrabold leading-snug tracking-[-0.01em] text-[#1A0A2E] group-hover:text-[#B331F1] transition">
        {post.title}
      </h2>
      <RatingLine post={post} />
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-[#7A6B99]">{getSummary(post)}</p>
      <div className="mt-4 flex items-center justify-between border-t border-[#EEE5FF] pt-3 text-xs font-semibold text-[#7A6B99]">
        <span className="inline-flex items-center gap-1">
          {location ? (
            <>
              <MapPin className="h-3.5 w-3.5" /> {location}
            </>
          ) : (
            'Details inside'
          )}
        </span>
        <ArrowUpRight className="h-4 w-4 text-[#B331F1] transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

function ImageArchiveCard({ post, href, index }: { post: SitePost; href: string; index: number }) {
  const image = getImage(post)
  return (
    <Link
      href={href}
      className="group mb-5 block break-inside-avoid overflow-hidden rounded-2xl border border-[#EEE5FF] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#B331F1]/30 hover:shadow-[0_8px_32px_rgba(179,49,241,0.12)]"
    >
      <div
        className={`relative overflow-hidden ${index % 3 === 0 ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}
      >
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(26,10,46,0.82))] opacity-80 transition group-hover:opacity-100" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h2 className="line-clamp-2 text-base font-extrabold leading-snug tracking-[-0.02em] text-white">
            {post.title}
          </h2>
          <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-white/70">
            View image <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

function BookmarkArchiveCard({
  post,
  href,
  index,
}: {
  post: SitePost
  href: string
  index: number
}) {
  const website = getField(post, ['website', 'url', 'link'])
  return (
    <Link href={href} className={`${cardBase} flex gap-4 p-5`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#B331F1]">
        <Globe className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A6B99]">
          Saved · {String(index + 1).padStart(2, '0')}
        </span>
        <h2 className="mt-1.5 text-[15px] font-extrabold leading-snug tracking-[-0.01em] text-[#1A0A2E] group-hover:text-[#B331F1] transition">
          {post.title}
        </h2>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[#7A6B99]">{getSummary(post)}</p>
        {website && (
          <p className="mt-2 truncate text-xs font-bold text-[#B331F1]">{cleanDomain(website)}</p>
        )}
      </div>
    </Link>
  )
}

function PdfArchiveCard({ post, href }: { post: SitePost; href: string }) {
  const category = getCategory(post, 'Document')
  return (
    <Link href={href} className={`${cardBase} flex flex-col p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#B331F1]">
          <FileText className="h-6 w-6" />
        </div>
        <span className="rounded-full border border-[#EEE5FF] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#7A6B99]">
          {category}
        </span>
      </div>
      <h2 className="mt-5 text-[15px] font-extrabold leading-snug tracking-[-0.01em] text-[#1A0A2E] group-hover:text-[#B331F1] transition">
        {post.title}
      </h2>
      <RatingLine post={post} />
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-[#7A6B99]">
        {getSummary(post)}
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-[#B331F1]">
        Open document <Download className="h-4 w-4" />
      </span>
    </Link>
  )
}

function ProfileArchiveCard({ post, href }: { post: SitePost; href: string }) {
  const avatar = getImages(post)[0]
  const role = getField(post, ['role', 'designation', 'company', 'location'])
  return (
    <Link href={href} className={`${cardBase} flex flex-col items-center p-6 text-center`}>
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#EEE5FF] bg-[#F3E8FF]">
        {avatar ? (
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserRound className="h-9 w-9 text-[#B331F1]" />
        )}
      </div>
      <h2 className="mt-4 text-[15px] font-extrabold tracking-[-0.01em] text-[#1A0A2E] group-hover:text-[#B331F1] transition">
        {post.title}
      </h2>
      {role && (
        <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-[#B331F1]">
          {role}
        </p>
      )}
      <RatingLine post={post} center />
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#7A6B99]">{getSummary(post)}</p>
    </Link>
  )
}
