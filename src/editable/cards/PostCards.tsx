import Link from 'next/link'
import { ArrowRight, Clock3 } from 'lucide-react'
import type { SitePost } from '@/lib/site-connector'
import type { TaskKey } from '@/lib/site-config'
import { editableDesignContract as dc, editablePalette as pal } from '@/editable/layouts/design-contract'

export function getEditablePostImage(post?: SitePost | null) {
  const media = Array.isArray(post?.media) ? post?.media : []
  const mediaUrl = media.find((item) => typeof item?.url === 'string' && item.url)?.url
  const content = post?.content && typeof post.content === 'object' ? post.content as Record<string, unknown> : {}
  const images = Array.isArray(content.images) ? content.images : []
  const contentImage = images.find((url): url is string => typeof url === 'string' && Boolean(url))
  const logo = typeof content.logo === 'string' ? content.logo : ''
  return mediaUrl || contentImage || logo || '/placeholder.svg?height=900&width=1400'
}

export function getEditableExcerpt(post?: SitePost | null, limit = 150) {
  const content = post?.content && typeof post.content === 'object' ? post.content as Record<string, unknown> : {}
  const raw =
    (typeof content.description === 'string' && content.description) ||
    (typeof content.summary === 'string' && content.summary) ||
    post?.summary ||
    ''
  const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return clean.length > limit ? `${clean.slice(0, limit).trim()}...` : clean
}

export function getEditableCategory(post?: SitePost | null) {
  const content = post?.content && typeof post.content === 'object' ? post.content as Record<string, unknown> : {}
  return (typeof content.category === 'string' && content.category) || post?.tags?.[0] || 'Featured'
}

export function postHref(task: TaskKey, post: SitePost, route = `/${task}`) {
  return `${route}/${post.slug}`
}

/* ─────────────────────────────────────────────────────────────
   Editorial Feature Card — full-bleed image with overlay text
   Used as the hero/lead card in a section.
───────────────────────────────────────────────────────────── */
export function EditorialFeatureCard({ post, href, label = 'Featured' }: { post: SitePost; href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="group block min-w-0 overflow-hidden rounded-2xl bg-[#1A0A2E] transition duration-300 hover:shadow-[0_20px_60px_rgba(179,49,241,0.22)]"
    >
      <div className="relative min-h-[520px] lg:min-h-[620px]">
        <img
          src={getEditablePostImage(post)}
          alt={post.title}
          className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-70"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,10,46,0.1),rgba(26,10,46,0.88))]" />
        <div className="relative z-10 flex h-full min-h-[460px] flex-col justify-end p-6 sm:p-8 lg:min-h-[560px]">
          <span className="mb-3 inline-block rounded-full bg-[#B331F1] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
            {label}
          </span>
          <h3 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">
            {post.title}
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
            {getEditableExcerpt(post, 190)}
          </p>
          <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-[#1A0A2E] transition group-hover:bg-[#F3E8FF]">
            Read story <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────────────────────────
   Rail Post Card — compact vertical card for horizontal rails
───────────────────────────────────────────────────────────── */
export function RailPostCard({ post, href, index }: { post: SitePost; href: string; index: number }) {
  return (
    <Link
      href={href}
      className="group block w-[200px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#EEE5FF] bg-white transition duration-300 hover:border-[#B331F1]/35 hover:shadow-[0_8px_28px_rgba(179,49,241,0.14)]"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-[#EEE5FF]">
        <img
          src={getEditablePostImage(post)}
          alt={post.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-[#1A0A2E]/80 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <div className="p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B331F1]">
          {getEditableCategory(post)}
        </p>
        <h3 className="mt-2 line-clamp-3 text-sm font-bold leading-snug text-[#1A0A2E] group-hover:text-[#B331F1] transition">
          {post.title}
        </h3>
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────────────────────────
   Compact Index Card — numbered list with thumbnail
───────────────────────────────────────────────────────────── */
export function CompactIndexCard({ post, href, index }: { post: SitePost; href: string; index: number }) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 gap-4 overflow-hidden rounded-2xl border border-[#EEE5FF] bg-white p-4 transition duration-300 hover:border-[#B331F1]/30 hover:shadow-[0_4px_20px_rgba(179,49,241,0.10)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B331F1] text-xs font-extrabold text-white">
        {index + 1}
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#B331F1]">
          <Clock3 className="h-3.5 w-3.5" /> {getEditableCategory(post)}
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-[#1A0A2E] group-hover:text-[#B331F1] transition">
          {post.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-[#7A6B99]">{getEditableExcerpt(post, 65)}</p>
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────────────────────────
   Article List Card — horizontal card with large side thumbnail
───────────────────────────────────────────────────────────── */
export function ArticleListCard({ post, href, index }: { post: SitePost; href: string; index: number }) {
  return (
    <Link
      href={href}
      className="group grid min-w-0 gap-5 overflow-hidden rounded-2xl border border-[#EEE5FF] bg-white p-4 transition duration-300 hover:border-[#B331F1]/30 hover:shadow-[0_4px_20px_rgba(179,49,241,0.10)] sm:grid-cols-[220px_minmax(0,1fr)]"
    >
      <div className="relative aspect-[16/12] overflow-hidden rounded-xl bg-[#EEE5FF] sm:aspect-auto sm:min-h-[190px]">
        <img
          src={getEditablePostImage(post)}
          alt={post.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
      </div>
      <div className="min-w-0 py-1 sm:py-4 sm:pr-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B331F1]">
          Read {String(index + 1).padStart(2, '0')}
        </p>
        <h2 className="mt-3 line-clamp-3 text-xl font-extrabold leading-tight tracking-[-0.02em] text-[#1A0A2E] group-hover:text-[#B331F1] transition sm:text-2xl">
          {post.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-[#7A6B99]">
          {getEditableExcerpt(post, 180)}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-[#B331F1]">
          Open article <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}
