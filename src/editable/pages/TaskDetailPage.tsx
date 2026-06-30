import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft, ArrowUpRight, Bookmark, Building2, Camera, CheckCircle2, Download,
  ExternalLink, FileText, Globe2, Mail, MapPin, Phone, Star, Tag, UserRound,
} from 'lucide-react'
import { buildPostMetadata, buildTaskMetadata } from '@/lib/seo'
import { fetchArticleComments, fetchTaskPostBySlug, fetchTaskPosts } from '@/lib/task-data'
import { getTaskConfig, SITE_CONFIG, type TaskKey } from '@/lib/site-config'
import type { SitePost } from '@/lib/site-connector'
import { EditableSiteShell } from '@/editable/shell/EditableSiteShell'
import { EditableArticleComments } from '@/editable/components/EditableArticleComments'
import { getTaskTheme, taskThemeStyle } from '@/editable/theme/task-themes'
import { Ads } from '@/lib/ads'

export const revalidate = 3

export async function generateEditableDetailMetadata(
  task: TaskKey,
  params: Promise<{ slug?: string; username?: string }>
) {
  const resolved = await params
  const slug = resolved.slug || resolved.username || ''
  const post = await fetchTaskPostBySlug(task, slug)
  return post ? await buildPostMetadata(task, post) : await buildTaskMetadata(task)
}

export async function EditableTaskDetailRoute({
  task,
  params,
}: {
  task: TaskKey
  params: Promise<{ slug?: string; username?: string }>
}) {
  const resolved = await params
  const slug = resolved.slug || resolved.username || ''
  const post = await fetchTaskPostBySlug(task, slug)
  if (!post) notFound()
  const related = (await fetchTaskPosts(task, 7))
    .filter((item) => item.slug !== post.slug)
    .slice(0, 4)
  const comments = task === 'article' ? await fetchArticleComments(post.slug, 50) : []
  return <TaskDetailView task={task} post={post} related={related} comments={comments} />
}

/* ── Helpers ──────────────────────────────────────────────────── */
const getContent = (post: SitePost) =>
  post.content && typeof post.content === 'object' ? (post.content as Record<string, unknown>) : {}
const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const isUrl = (value: string) => value.startsWith('/') || /^https?:\/\//i.test(value)

const getField = (post: SitePost, keys: string[]) => {
  const content = getContent(post)
  for (const key of keys) {
    const value = asText(content[key])
    if (value) return value
  }
  return ''
}

const getImages = (post: SitePost) => {
  const content = getContent(post)
  const media = Array.isArray(post.media)
    ? post.media.map((item) => item?.url).filter((url): url is string => typeof url === 'string' && isUrl(url))
    : []
  const images = Array.isArray(content.images)
    ? content.images.filter((url): url is string => typeof url === 'string' && isUrl(url))
    : []
  const singleImages = ['image', 'featuredImage', 'thumbnail', 'logo', 'avatar']
    .map((key) => asText(content[key]))
    .filter((url) => url && isUrl(url))
  return [...media, ...images, ...singleImages].filter(Boolean).slice(0, 12)
}

const getBody = (post: SitePost) => {
  const content = getContent(post)
  return (
    asText(content.body) ||
    asText(content.description) ||
    asText(content.details) ||
    post.summary ||
    'Details will appear here once available.'
  )
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const safeUrl = (value: string) => (/^https?:\/\//i.test(value) ? value : '#')

const linkifyMarkdown = (value: string) =>
  value.replace(
    /\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/gi,
    (_match, label, url) =>
      `<a href="${safeUrl(url)}" target="_blank" rel="nofollow noopener noreferrer">${label}</a>`
  )

const linkifyText = (value: string) =>
  linkifyMarkdown(value).replace(
    /(^|[\s(>])((https?:\/\/)[^\s<)]+)/gi,
    (_match, prefix, url) =>
      `${prefix}<a href="${safeUrl(url)}" target="_blank" rel="nofollow noopener noreferrer">${url}</a>`
  )

const hardenLinks = (html: string) =>
  html.replace(/<a\s+([^>]*href=["'][^"']+["'][^>]*)>/gi, (_match, attrs) => {
    let next = String(attrs).replace(/\s+on\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    if (!/\starget=/i.test(next)) next += ' target="_blank"'
    if (!/\srel=/i.test(next)) next += ' rel="nofollow noopener noreferrer"'
    return `<a ${next}>`
  })

const sanitizeHtml = (html: string) =>
  hardenLinks(
    html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<(iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/\s+on\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(href|src)=(['"])javascript:[\s\S]*?\2/gi, '$1="#"')
  )

const formatPlainText = (raw: string) => {
  const value = raw.trim()
  if (!value) return ''
  if (/<[a-z][\s\S]*>/i.test(value)) return sanitizeHtml(linkifyMarkdown(value))
  return value
    .split(/\n{2,}/)
    .map((part) => `<p>${linkifyText(escapeHtml(part).replace(/\n/g, '<br />'))}</p>`)
    .join('')
}

const summaryText = (post: SitePost) =>
  post.summary || asText(getContent(post).description) || asText(getContent(post).excerpt) || ''
const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const leadText = (post: SitePost) => {
  const summary = summaryText(post)
  if (!summary) return ''
  const lead = stripHtml(summary)
  return lead && lead !== stripHtml(getBody(post)) ? lead : ''
}
const categoryOf = (post: SitePost, fallback: string) =>
  asText(getContent(post).category) || post.tags?.[0] || fallback
const mapSrcFor = (post: SitePost) => {
  const address = getField(post, ['address', 'location', 'city'])
  const lat = getField(post, ['lat', 'latitude'])
  const lng = getField(post, ['lng', 'lon', 'longitude'])
  if (lat && lng)
    return `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=14&output=embed`
  if (address)
    return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=13&output=embed`
  return ''
}

/* ── Rating helpers ────────────────────────────────────────────── */
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

/* ═══════════════════════════════════════════════════════════════
   MAIN DETAIL VIEW DISPATCHER
═══════════════════════════════════════════════════════════════ */
export function TaskDetailView({
  task,
  post,
  related,
  comments = [],
}: {
  task: TaskKey
  post: SitePost
  related: SitePost[]
  comments?: Array<{ id: string; name: string; comment: string; createdAt: string }>
}) {
  return (
    <EditableSiteShell>
      <main className="min-h-screen bg-[#FBF5F7] text-[#1A0A2E]">
        {task === 'listing' ? <ListingDetail post={post} related={related} /> : null}
        {task === 'classified' ? <ClassifiedDetail post={post} related={related} /> : null}
        {task === 'image' ? <ImageDetail post={post} related={related} /> : null}
        {task === 'sbm' ? <BookmarkDetail post={post} related={related} /> : null}
        {task === 'pdf' ? <PdfDetail post={post} related={related} /> : null}
        {task === 'profile' ? <ProfileDetail post={post} related={related} /> : null}
        {task === 'article' ? (
          <ArticleDetail post={post} related={related} comments={comments} />
        ) : null}
      </main>
    </EditableSiteShell>
  )
}

/* ── Shared UI atoms ──────────────────────────────────────────── */
function DetailMeta({
  post,
  category,
  center = false,
}: {
  post: SitePost
  category?: string
  center?: boolean
}) {
  const rating = ratingOf(post)
  const filled = Math.round(rating)
  return (
    <div
      className={`mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 ${center ? 'justify-center' : ''}`}
    >
      <span className="inline-flex items-center gap-[3px]">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            className={`h-[18px] w-[18px] ${i < filled ? 'fill-[#B331F1] text-[#B331F1]' : 'fill-[#EEE5FF] text-[#EEE5FF]'}`}
          />
        ))}
      </span>
      <span className="text-sm font-extrabold text-[#1A0A2E]">{rating.toFixed(1)}</span>
      <span className="text-sm text-[#7A6B99]">{reviewsOf(post)} reviews</span>
      {category ? (
        <>
          <span className="h-1 w-1 rounded-full bg-[#7A6B99] opacity-50" />
          <span className="rounded-full bg-[#F3E8FF] px-3 py-1 text-xs font-extrabold text-[#B331F1]">
            {category}
          </span>
        </>
      ) : null}
    </div>
  )
}

function Kicker({ task, children }: { task: TaskKey; children: React.ReactNode }) {
  const theme = getTaskTheme(task)
  return (
    <div className="flex items-center gap-2.5 text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#B331F1]">
      <span>{theme.kicker}</span>
      <span className="h-1 w-1 rounded-full bg-[#B331F1] opacity-40" />
      <span className="text-[#7A6B99]">{children}</span>
    </div>
  )
}

function BackLink({ task }: { task: TaskKey }) {
  const taskConfig = getTaskConfig(task)
  return (
    <Link
      href={taskConfig?.route || '/'}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-[#7A6B99] transition hover:text-[#B331F1]"
    >
      <ArrowLeft className="h-4 w-4" /> Back to {taskConfig?.label || 'posts'}
    </Link>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ARTICLE DETAIL  — Ad: article-bottom after body
═══════════════════════════════════════════════════════════════ */
function ArticleDetail({
  post,
  related,
  comments,
}: {
  post: SitePost
  related: SitePost[]
  comments: Array<{ id: string; name: string; comment: string; createdAt: string }>
}) {
  const images = getImages(post)
  return (
    <>
      {/* Dark hero banner */}
      <div className="relative overflow-hidden bg-[#1A0A2E]">
        <div className="pointer-events-none absolute -left-32 -top-16 h-64 w-64 rounded-full bg-[#B331F1] opacity-15 blur-[80px]" />
        <div className="mx-auto max-w-4xl px-4 pb-10 pt-12 sm:px-6">
          <BackLink task="article" />
          <div className="mt-8 flex items-center gap-2">
            <span className="rounded-full bg-[#B331F1] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
              {categoryOf(post, 'Article')}
            </span>
          </div>
          <h1 className="mt-5 text-balance text-4xl font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-3 text-sm text-white/45">{SITE_CONFIG.name}</p>
        </div>
      </div>

      {/* Main content */}
      <article className="mx-auto max-w-4xl px-4 pb-16 pt-10 sm:px-6">
        {images[0] ? (
          <img
            src={images[0]}
            alt=""
            className="aspect-[16/9] w-full rounded-2xl border border-[#EEE5FF] object-cover"
          />
        ) : null}
        <BodyContent post={post} />

        {/* Ad: article-bottom after body */}
        <div className="mx-auto max-w-6xl px-4 py-6">
          <Ads slot="article-bottom" showLabel eager className="mx-auto w-full" />
        </div>

        <EditableArticleComments slug={post.slug} comments={comments} />
      </article>

      <RelatedStrip task="article" related={related} />
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
   LISTING (BUSINESS) DETAIL  — Ad: in-feed between sections
═══════════════════════════════════════════════════════════════ */
function ListingDetail({ post, related }: { post: SitePost; related: SitePost[] }) {
  const images = getImages(post)
  const logo = images[0]
  const cover = images[1] || images[0]
  const gallery = images.slice(2)
  const address = getField(post, ['address', 'location', 'city'])
  const phone = getField(post, ['phone', 'telephone', 'mobile'])
  const email = getField(post, ['email'])
  const website = getField(post, ['website', 'url'])
  const category = getField(post, ['category']) || post.tags?.[0] || 'Business'
  const mapSrc = mapSrcFor(post)

  return (
    <>
      {/* Cover image */}
      <div className="relative h-64 overflow-hidden bg-[#1A0A2E] sm:h-80 lg:h-96">
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Building2 className="h-20 w-20 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A0A2E] via-[#1A0A2E]/30 to-transparent" />
        <div className="absolute left-4 top-5 sm:left-6 lg:left-8">
          <BackLink task="listing" />
        </div>
      </div>

      {/* Identity bar */}
      <div className="bg-[#1A0A2E]">
        <div className="mx-auto max-w-[var(--editable-container)] px-4 pb-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            {/* Logo */}
            <div className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-[#1A0A2E] bg-white shadow-xl sm:-mt-12 sm:h-24 sm:w-24">
              {logo ? (
                <img src={logo} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-[#B331F1]" />
              )}
            </div>
            <div className="flex-1 pb-1">
              <span className="rounded-full bg-[#B331F1]/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#FF97D0]">
                {category}
              </span>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-4xl">
                {post.title}
              </h1>
              <DetailMeta post={post} />
            </div>
            {/* CTA buttons */}
            <div className="flex shrink-0 flex-wrap gap-2.5 pb-1">
              {website ? (
                <Link href={website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#B331F1] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#9B28D4]">
                  <Globe2 className="h-4 w-4" /> Website
                </Link>
              ) : null}
              {phone ? (
                <a href={`tel:${phone}`} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-extrabold text-white transition hover:border-white/40">
                  <Phone className="h-4 w-4" /> Call
                </a>
              ) : null}
            </div>
          </div>

          {/* Info strip */}
          {(address || phone || email) ? (
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-sm text-white/55">
              {address ? (
                <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#FF97D0]" /> {address}</span>
              ) : null}
              {phone ? (
                <a href={`tel:${phone}`} className="inline-flex items-center gap-2 transition hover:text-white">
                  <Phone className="h-4 w-4 text-[#FF97D0]" /> {phone}
                </a>
              ) : null}
              {email ? (
                <a href={`mailto:${email}`} className="inline-flex items-center gap-2 transition hover:text-white">
                  <Mail className="h-4 w-4 text-[#FF97D0]" /> {email}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Main content + sidebar */}
      <section className="mx-auto max-w-[var(--editable-container)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <article className="min-w-0 space-y-6">
            {/* About */}
            <div className="rounded-2xl border border-[#EEE5FF] bg-white p-6">
              <h2 className="text-lg font-extrabold tracking-[-0.01em] text-[#1A0A2E]">About</h2>
              {leadText(post) ? (
                <p className="mt-3 text-[#7A6B99]">{leadText(post)}</p>
              ) : null}
              <BodyContent post={post} />
            </div>

            {/* Ad */}
            <Ads slot="in-feed" showLabel eager className="mx-auto w-full" />

            {/* Gallery */}
            {gallery.length > 0 ? (
              <div className="rounded-2xl border border-[#EEE5FF] bg-white p-6">
                <h2 className="text-lg font-extrabold tracking-[-0.01em] text-[#1A0A2E]">Gallery</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {gallery.slice(0, 9).map((img, i) => (
                    <div key={`${img}-${i}`} className="aspect-[4/3] overflow-hidden rounded-xl">
                      <img src={img} alt="" className="h-full w-full object-cover transition duration-300 hover:scale-105" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </article>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {/* Contact card */}
            <div className="rounded-2xl border border-[#EEE5FF] bg-white p-5">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A6B99]">Contact</h3>
              <div className="mt-4 grid gap-3 text-sm">
                {address ? (
                  <div className="flex items-start gap-3 text-[#7A6B99]">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#B331F1]" /> {address}
                  </div>
                ) : null}
                {phone ? (
                  <a href={`tel:${phone}`} className="flex items-center gap-3 text-[#7A6B99] transition hover:text-[#B331F1]">
                    <Phone className="h-4 w-4 shrink-0 text-[#B331F1]" /> {phone}
                  </a>
                ) : null}
                {email ? (
                  <a href={`mailto:${email}`} className="flex items-center gap-3 text-[#7A6B99] transition hover:text-[#B331F1]">
                    <Mail className="h-4 w-4 shrink-0 text-[#B331F1]" /> {email}
                  </a>
                ) : null}
                {website ? (
                  <Link href={website} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-[#7A6B99] transition hover:text-[#B331F1]">
                    <Globe2 className="h-4 w-4 shrink-0 text-[#B331F1]" />
                    <span className="truncate">{website.replace(/^https?:\/\//, '')}</span>
                  </Link>
                ) : null}
              </div>
              {(website || phone) ? (
                <div className="mt-5 flex gap-2.5">
                  {website ? (
                    <Link href={website} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#B331F1] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#9B28D4]">
                      Visit <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                  {phone ? (
                    <a href={`tel:${phone}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#EEE5FF] px-4 py-2.5 text-sm font-extrabold text-[#1A0A2E] transition hover:border-[#B331F1]/40 hover:text-[#B331F1]">
                      <Phone className="h-3.5 w-3.5" /> Call
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Map */}
            {mapSrc ? (
              <div className="overflow-hidden rounded-2xl border border-[#EEE5FF]">
                <iframe src={mapSrc} title="Map" loading="lazy" className="h-56 w-full border-0" />
              </div>
            ) : null}

            <RelatedPanel task="listing" post={post} related={related} />
          </aside>
        </div>
      </section>

      <RelatedStrip task="listing" related={related} />
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CLASSIFIED DETAIL
═══════════════════════════════════════════════════════════════ */
function ClassifiedDetail({ post, related }: { post: SitePost; related: SitePost[] }) {
  const images = getImages(post)
  const price = getField(post, ['price', 'amount', 'budget'])
  const location = getField(post, ['location', 'address', 'city'])
  const condition = getField(post, ['condition', 'availability', 'type'])
  const phone = getField(post, ['phone', 'telephone', 'mobile'])
  const email = getField(post, ['email'])
  const website = getField(post, ['website', 'url'])
  return (
    <>
      <section className="mx-auto grid max-w-[var(--editable-container)] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BackLink task="classified" />
          <div className="mt-6 rounded-2xl border border-[#EEE5FF] bg-white p-6 shadow-[0_8px_32px_rgba(179,49,241,0.10)]">
            <Kicker task="classified">Classified</Kicker>
            <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-[-0.02em] text-[#1A0A2E]">
              {post.title}
            </h1>
            <DetailMeta post={post} category={getField(post, ['category'])} />
            <p className="mt-5 text-4xl font-extrabold tracking-[-0.03em] text-[#B331F1]">
              {price || 'Open offer'}
            </p>
            <div className="mt-5 space-y-2">
              {condition ? <BadgeLine label="Condition" value={condition} /> : null}
              {location ? <BadgeLine label="Location" value={location} /> : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#B331F1] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#9B28D4]"
                >
                  <Phone className="h-4 w-4" /> Call now
                </a>
              ) : null}
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[#EEE5FF] px-5 py-2.5 text-sm font-extrabold text-[#1A0A2E] transition hover:border-[#B331F1]/40 hover:text-[#B331F1]"
                >
                  <Mail className="h-4 w-4" /> Email
                </a>
              ) : null}
            </div>
          </div>
        </aside>
        <article className="min-w-0">
          <ImageStrip images={images} label="Offer images" large />
          <BodyContent post={post} />
          <ContactAction website={website} phone={phone} email={email} />
        </article>
      </section>
      <RelatedStrip task="classified" related={related} />
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
   IMAGE DETAIL
═══════════════════════════════════════════════════════════════ */
function ImageDetail({ post, related }: { post: SitePost; related: SitePost[] }) {
  const images = getImages(post)
  const gallery = images.length ? images : ['/placeholder.svg?height=900&width=1200']
  return (
    <>
      <section className="mx-auto max-w-[var(--editable-container)] px-4 py-12 sm:px-6 lg:px-8">
        <BackLink task="image" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="columns-1 gap-5 [column-fill:_balance] sm:columns-2">
            {gallery.map((image, index) => (
              <figure
                key={`${image}-${index}`}
                className="mb-5 break-inside-avoid overflow-hidden rounded-2xl border border-[#EEE5FF] bg-white"
              >
                <img src={image} alt="" className="w-full object-cover" />
              </figure>
            ))}
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#EEE5FF] bg-white px-3.5 py-1.5 text-xs font-extrabold text-[#7A6B99]">
              <Camera className="h-3.5 w-3.5 text-[#B331F1]" /> Image story
            </div>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.03em] text-[#1A0A2E] sm:text-5xl">
              {post.title}
            </h1>
            {leadText(post) ? (
              <p className="mt-5 text-lg leading-8 text-[#7A6B99]">{leadText(post)}</p>
            ) : null}
            <BodyContent post={post} compact />
          </aside>
        </div>
      </section>
      <RelatedStrip task="image" related={related} />
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
   BOOKMARK DETAIL
═══════════════════════════════════════════════════════════════ */
function BookmarkDetail({ post, related }: { post: SitePost; related: SitePost[] }) {
  const website = getField(post, ['website', 'url', 'link'])
  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <BackLink task="sbm" />
        <div className="mt-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#B331F1]">
          <Bookmark className="h-7 w-7" />
        </div>
        <div className="mt-5">
          <Kicker task="sbm">Saved resource</Kicker>
        </div>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.03em] text-[#1A0A2E] sm:text-5xl">
          {post.title}
        </h1>
        {leadText(post) ? (
          <p className="mt-5 text-lg leading-8 text-[#7A6B99]">{leadText(post)}</p>
        ) : null}
        {website ? (
          <Link
            href={website}
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#B331F1] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#9B28D4]"
          >
            Open resource <ExternalLink className="h-4 w-4" />
          </Link>
        ) : null}
        <BodyContent post={post} />
      </article>
      <RelatedStrip task="sbm" related={related} />
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PDF DETAIL
═══════════════════════════════════════════════════════════════ */
function PdfDetail({ post, related }: { post: SitePost; related: SitePost[] }) {
  const fileUrl = getField(post, ['fileUrl', 'pdfUrl', 'documentUrl', 'url'])
  return (
    <section className="mx-auto max-w-[var(--editable-container)] px-4 py-12 sm:px-6 lg:px-8">
      <BackLink task="pdf" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#B331F1]">
              <FileText className="h-9 w-9" />
            </div>
            <div className="min-w-0">
              <Kicker task="pdf">{categoryOf(post, 'Document')}</Kicker>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.02em] text-[#1A0A2E] sm:text-4xl">
                {post.title}
              </h1>
            </div>
          </div>
          <BodyContent post={post} />
          {fileUrl ? (
            <div className="mt-10 overflow-hidden rounded-2xl border border-[#EEE5FF] bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-[#EEE5FF] p-4">
                <span className="text-sm font-extrabold text-[#1A0A2E]">Document preview</span>
                <Link
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#B331F1] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#9B28D4]"
                >
                  Download <Download className="h-4 w-4" />
                </Link>
              </div>
              <iframe
                src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                title={post.title}
                className="h-[78vh] w-full bg-[#F3E8FF]"
              />
            </div>
          ) : null}
        </article>
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {fileUrl ? (
            <div className="rounded-2xl border border-[#EEE5FF] bg-white p-6">
              <p className="text-sm font-extrabold text-[#1A0A2E]">Get this document</p>
              <p className="mt-2 text-sm leading-6 text-[#7A6B99]">
                Open or download the full file in a new tab.
              </p>
              <Link
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#B331F1] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#9B28D4]"
              >
                Download <Download className="h-4 w-4" />
              </Link>
            </div>
          ) : null}
          <RelatedPanel task="pdf" post={post} related={related} />
        </aside>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PROFILE DETAIL  — Ad: sidebar slot in aside
═══════════════════════════════════════════════════════════════ */
function ProfileDetail({ post, related }: { post: SitePost; related: SitePost[] }) {
  const images = getImages(post)
  const role = getField(post, ['role', 'designation', 'company', 'location'])
  const website = getField(post, ['website', 'url'])
  const email = getField(post, ['email'])
  return (
    <>
      {/* Dark hero */}
      <div className="relative overflow-hidden bg-[#1A0A2E]">
        <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-[#B331F1] opacity-12 blur-[80px]" />
        <div className="mx-auto max-w-[var(--editable-container)] px-4 py-12 sm:px-6 lg:px-8">
          <BackLink task="profile" />
        </div>
      </div>

      <section className="mx-auto max-w-[var(--editable-container)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start space-y-5">
            {/* Profile card */}
            <div className="rounded-2xl border border-[#EEE5FF] bg-white p-8 text-center shadow-[0_8px_32px_rgba(179,49,241,0.10)]">
              <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#EEE5FF] bg-[#F3E8FF]">
                {images[0] ? (
                  <img src={images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="h-12 w-12 text-[#B331F1]" />
                )}
              </div>
              <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.02em] text-[#1A0A2E]">
                {post.title}
              </h1>
              {role ? (
                <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#B331F1]">
                  {role}
                </p>
              ) : null}
              <DetailMeta post={post} center />
              <ContactAction website={website} email={email} bare />
            </div>

            {/* Ad: sidebar slot */}
            <div className="mx-auto max-w-6xl px-0 py-2">
              <Ads slot="sidebar" showLabel eager className="mx-auto w-full" />
            </div>
          </aside>

          <article className="min-w-0">
            <Kicker task="profile">Profile</Kicker>
            <BodyContent post={post} />
            <ImageStrip images={images.slice(1)} label="Gallery" />
          </article>
        </div>
      </section>
      <RelatedStrip task="profile" related={related} />
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SHARED BUILDING BLOCKS
═══════════════════════════════════════════════════════════════ */
function Divider() {
  return <div className="my-8 h-px bg-[#EEE5FF]" />
}

function BodyContent({ post, compact = false }: { post: SitePost; compact?: boolean }) {
  return (
    <div
      className={`article-content mt-8 max-w-none text-[#1A0A2E] ${compact ? 'text-[15px] leading-7' : 'text-[1.0625rem] leading-8'}`}
      dangerouslySetInnerHTML={{ __html: formatPlainText(getBody(post)) }}
    />
  )
}

function InfoGrid({ items }: { items: Array<[string, string, typeof MapPin]> }) {
  const visible = items.filter(([, value]) => value)
  if (!visible.length) return null
  return (
    <div className="mt-7 grid gap-3 sm:grid-cols-2">
      {visible.map(([label, value, Icon]) => (
        <div
          key={label}
          className="rounded-2xl border border-[#EEE5FF] bg-white p-4"
        >
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-[#7A6B99]">
            <Icon className="h-4 w-4 text-[#B331F1]" /> {label}
          </div>
          <p className="mt-2 break-words text-sm font-semibold leading-6 text-[#1A0A2E]">{value}</p>
        </div>
      ))}
    </div>
  )
}

function ImageStrip({
  images,
  label,
  large = false,
}: {
  images: string[]
  label: string
  large?: boolean
}) {
  if (!images.length) return null
  return (
    <section className="mt-10">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A6B99]">{label}</p>
      <div className={`mt-4 grid gap-3 ${large ? 'sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {images
          .slice(0, large ? 4 : 8)
          .map((image, index) => (
            <img
              key={`${image}-${index}`}
              src={image}
              alt=""
              className="aspect-[4/3] rounded-2xl border border-[#EEE5FF] object-cover"
            />
          ))}
      </div>
    </section>
  )
}

function MapBox({ src, label }: { src: string; label: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#EEE5FF] bg-white">
      <div className="flex items-center gap-2 p-4 text-sm font-extrabold text-[#1A0A2E]">
        <MapPin className="h-4 w-4 text-[#B331F1]" /> {label || 'Map location'}
      </div>
      <iframe src={src} title="Map" loading="lazy" className="h-72 w-full border-0" />
    </div>
  )
}

function ContactAction({
  website,
  phone,
  email,
  bare = false,
}: {
  website?: string
  phone?: string
  email?: string
  bare?: boolean
}) {
  if (!website && !phone && !email) return null
  const buttons = (
    <div className={`flex flex-wrap gap-2.5 ${bare ? 'justify-center' : ''}`}>
      {website ? (
        <Link
          href={website}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#B331F1] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#9B28D4]"
        >
          Website <ExternalLink className="h-4 w-4" />
        </Link>
      ) : null}
      {phone ? (
        <a
          href={`tel:${phone}`}
          className="inline-flex items-center gap-2 rounded-full border border-[#EEE5FF] px-4 py-2.5 text-sm font-extrabold text-[#1A0A2E] transition hover:border-[#B331F1]/40 hover:text-[#B331F1]"
        >
          <Phone className="h-4 w-4" /> Call
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-2 rounded-full border border-[#EEE5FF] px-4 py-2.5 text-sm font-extrabold text-[#1A0A2E] transition hover:border-[#B331F1]/40 hover:text-[#B331F1]"
        >
          <Mail className="h-4 w-4" /> Email
        </a>
      ) : null}
    </div>
  )
  if (bare) return <div className="mt-6">{buttons}</div>
  return (
    <div className="rounded-2xl border border-[#EEE5FF] bg-white p-5">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A6B99]">
        Quick actions
      </p>
      <div className="mt-4">{buttons}</div>
    </div>
  )
}

function BadgeLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#EEE5FF] bg-[#F8F5FF] px-4 py-3 text-sm">
      <span className="font-extrabold uppercase tracking-wider text-[#7A6B99]">{label}</span>
      <span className="font-extrabold text-[#1A0A2E]">{value}</span>
    </div>
  )
}

function RelatedPanel({
  task,
  post,
  related,
}: {
  task: TaskKey
  post: SitePost
  related: SitePost[]
}) {
  const taskConfig = getTaskConfig(task)
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#EEE5FF] bg-white p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A6B99]">
          About this post
        </p>
        <div className="mt-4 grid gap-2.5 text-sm text-[#7A6B99]">
          <p className="inline-flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#B331F1]" /> {taskConfig?.label || task}
          </p>
          <p className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#B331F1]" /> {SITE_CONFIG.name}
          </p>
        </div>
      </div>
      {related.length ? (
        <div className="rounded-2xl border border-[#EEE5FF] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-extrabold tracking-[-0.01em] text-[#1A0A2E]">
              More like this
            </h2>
            <Link
              href={taskConfig?.route || '/'}
              className="text-xs font-extrabold text-[#B331F1] transition hover:opacity-75"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {related.map((item) => (
              <RelatedCard key={item.id || item.slug} task={task} post={item} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function RelatedStrip({ task, related }: { task: TaskKey; related: SitePost[] }) {
  if (!related.length) return null
  const taskConfig = getTaskConfig(task)
  return (
    <section className="border-t border-[#EEE5FF] bg-[#F8F5FF]">
      <div className="mx-auto max-w-[var(--editable-container)] px-4 py-12 sm:py-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.26em] text-[#B331F1]">
              Related
            </p>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-[-0.02em] text-[#1A0A2E]">
              More {(taskConfig?.label || 'posts').toLowerCase()}
            </h2>
          </div>
          <Link
            href={taskConfig?.route || '/'}
            className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#B331F1] transition hover:opacity-75"
          >
            View all <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((item) => (
            <RelatedCard key={item.id || item.slug} task={task} post={item} grid />
          ))}
        </div>
      </div>
    </section>
  )
}

function RelatedCard({
  task,
  post,
  grid = false,
}: {
  task: TaskKey
  post: SitePost
  grid?: boolean
}) {
  const image = getImages(post)[0]
  const href = `${getTaskConfig(task)?.route || `/${task}`}/${post.slug}`
  if (grid) {
    return (
      <Link
        href={href}
        className="group block overflow-hidden rounded-2xl border border-[#EEE5FF] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#B331F1]/30 hover:shadow-[0_8px_32px_rgba(179,49,241,0.10)]"
      >
        <div className="aspect-[16/10] overflow-hidden bg-[#F3E8FF]">
          {image ? (
            <img
              src={image}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <FileText className="h-7 w-7 text-[#B331F1]" />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 text-sm font-extrabold leading-snug tracking-[-0.01em] text-[#1A0A2E] group-hover:text-[#B331F1] transition">
            {post.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#7A6B99]">
            {stripHtml(summaryText(post))}
          </p>
        </div>
      </Link>
    )
  }
  return (
    <Link
      href={href}
      className="group flex gap-3 rounded-2xl border border-[#EEE5FF] bg-white p-3 transition hover:border-[#B331F1]/30 hover:shadow-[0_4px_16px_rgba(179,49,241,0.08)]"
    >
      {image && task !== 'sbm' ? (
        <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF]">
          <FileText className="h-5 w-5 text-[#B331F1]" />
        </div>
      )}
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-xs font-extrabold leading-snug tracking-[-0.01em] text-[#1A0A2E] group-hover:text-[#B331F1] transition">
          {post.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#7A6B99]">
          {stripHtml(summaryText(post))}
        </p>
      </div>
    </Link>
  )
}
