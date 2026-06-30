import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Filter, Search } from 'lucide-react'
import { buildPageMetadata } from '@/lib/seo'
import { fetchSiteFeed } from '@/lib/site-connector'
import { getPostTaskKey } from '@/lib/task-data'
import { getMockPostsForTask } from '@/lib/mock-posts'
import { SITE_CONFIG, type TaskKey } from '@/lib/site-config'
import type { SitePost } from '@/lib/site-connector'
import { EditableSiteShell } from '@/editable/shell/EditableSiteShell'
import { pagesContent } from '@/editable/content/pages.content'
import { Ads } from '@/lib/ads'

export const revalidate = 3

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    path: '/search',
    title: pagesContent.search.metadata.title,
    description: pagesContent.search.metadata.description,
  })
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ')
const compactText = (value: unknown) =>
  typeof value === 'string' ? stripHtml(value).replace(/\s+/g, ' ').trim().toLowerCase() : ''
const getContent = (post: SitePost) =>
  post.content && typeof post.content === 'object' ? (post.content as Record<string, unknown>) : {}
const compactRaw = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const getImage = (post: SitePost) => {
  const content = getContent(post)
  const media = Array.isArray(post.media)
    ? post.media.find((item) => typeof item?.url === 'string')?.url
    : ''
  const images = Array.isArray(content.images)
    ? (content.images.find((item) => typeof item === 'string') as string | undefined)
    : ''
  return (
    media ||
    compactRaw(content.featuredImage) ||
    compactRaw(content.image) ||
    compactRaw(content.thumbnail) ||
    images ||
    ''
  )
}
const summaryOf = (post: SitePost) =>
  post.summary ||
  compactRaw(getContent(post).description) ||
  compactRaw(getContent(post).excerpt) ||
  ''

const matches = (post: SitePost, query: string, category: string, task: string) => {
  const content = getContent(post)
  const typeText = compactText(content.type)
  if (typeText === 'comment') return false
  const derivedTask = getPostTaskKey(post) || typeText
  if (task && derivedTask !== task) return false
  const categoryText = compactText(content.category)
  const tagsText = compactText(Array.isArray(post.tags) ? post.tags.join(' ') : '')
  if (category && !(categoryText || tagsText).includes(category)) return false
  if (!query) return true
  return [
    post.title,
    post.summary,
    content.description,
    content.body,
    content.excerpt,
    content.category,
    Array.isArray(post.tags) ? post.tags.join(' ') : '',
  ].some((value) => compactText(value).includes(query))
}

/* ── Result card ───────────────────────────────────────────────── */
function SearchResultCard({ post }: { post: SitePost }) {
  const task = getPostTaskKey(post) as TaskKey | null
  const taskRoute = SITE_CONFIG.tasks.find((item) => item.key === task)?.route
  const href = `${taskRoute || `/${task || 'article'}`}/${post.slug}`
  const image = getImage(post)
  const summary = summaryOf(post)
  const taskLabel = SITE_CONFIG.tasks.find((item) => item.key === task)?.label || 'Post'

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#EEE5FF] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#B331F1]/30 hover:shadow-[0_8px_32px_rgba(179,49,241,0.12)]"
    >
      {image ? (
        <div className="aspect-[16/10] overflow-hidden bg-[#F3E8FF]">
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        </div>
      ) : (
        <div className="flex aspect-[16/10] items-center justify-center bg-[#F3E8FF]">
          <Search className="h-8 w-8 text-[#B331F1]/40" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <span className="inline-block self-start rounded-full bg-[#F3E8FF] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#B331F1]">
          {taskLabel}
        </span>
        <h2 className="mt-3 line-clamp-2 text-base font-extrabold leading-snug tracking-[-0.01em] text-[#1A0A2E] group-hover:text-[#B331F1] transition">
          {post.title}
        </h2>
        {summary ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#7A6B99]">
            {stripHtml(summary)}
          </p>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-extrabold text-[#B331F1] opacity-0 transition duration-200 group-hover:opacity-100">
          View <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  )
}

/* ── Page ──────────────────────────────────────────────────────── */
export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; category?: string; task?: string; master?: string }>
}) {
  const resolved = (await searchParams) || {}
  const query = (resolved.q || '').trim()
  const normalized = query.toLowerCase()
  const category = (resolved.category || '').trim().toLowerCase()
  const task = (resolved.task || '').trim().toLowerCase()
  const useMaster = resolved.master !== '0'
  const feed = await fetchSiteFeed(
    useMaster ? 1000 : 300,
    useMaster
      ? { fresh: true, category: category || undefined, task: task || undefined }
      : undefined
  )
  const mockPosts = SITE_CONFIG.tasks
    .filter((item) => item.enabled)
    .flatMap((item) => getMockPostsForTask(item.key))
  const posts = feed?.posts?.length ? feed.posts : mockPosts
  const results = posts.filter((post) => matches(post, normalized, category, task)).slice(0, normalized ? 80 : 36)
  const enabledTasks = SITE_CONFIG.tasks.filter((item) => item.enabled)

  return (
    <EditableSiteShell>
      <main className="min-h-screen bg-[#FBF5F7] text-[#1A0A2E]">
        {/* Dark hero */}
        <div className="relative overflow-hidden bg-[#1A0A2E]">
          <div className="pointer-events-none absolute -left-32 -top-16 h-72 w-72 rounded-full bg-[#B331F1] opacity-15 blur-[90px]" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-[#FF62BB] opacity-10 blur-[70px]" />
          <div className="mx-auto max-w-[var(--editable-container)] px-4 pb-12 pt-14 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#B331F1]/30 bg-[#B331F1]/10 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#FF97D0]">
                {pagesContent.search.hero.badge}
              </span>
              <h1 className="mt-6 text-balance text-4xl font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-5xl">
                {pagesContent.search.hero.title}
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/50">
                {pagesContent.search.hero.description}
              </p>
            </div>

            {/* Search form */}
            <form
              action="/search"
              className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm sm:p-5"
            >
              <input type="hidden" name="master" value="1" />
              <label className="flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-5 py-3">
                <Search className="h-5 w-5 shrink-0 text-white/50" />
                <input
                  name="q"
                  defaultValue={query}
                  placeholder={pagesContent.search.hero.placeholder}
                  className="min-w-0 flex-1 bg-transparent text-base font-bold text-white outline-none placeholder:text-white/35"
                />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5">
                  <Filter className="h-4 w-4 shrink-0 text-white/50" />
                  <input
                    name="category"
                    defaultValue={category}
                    placeholder="Category"
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/35"
                  />
                </label>
                <select
                  name="task"
                  defaultValue={task}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white outline-none"
                >
                  <option value="" className="text-[#1A0A2E]">All content types</option>
                  {enabledTasks.map((item) => (
                    <option key={item.key} value={item.key} className="text-[#1A0A2E]">
                      {item.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-full bg-[#B331F1] px-6 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#9B28D4]"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Ad: header slot after search form */}
        <div className="mx-auto max-w-6xl px-4 py-6">
          <Ads slot="header" showLabel eager className="mx-auto w-full" />
        </div>

        {/* Results */}
        <section className="mx-auto max-w-[var(--editable-container)] px-4 pb-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.26em] text-[#B331F1]">
                {results.length} results
              </p>
              <h2 className="mt-1.5 text-2xl font-extrabold tracking-[-0.02em] text-[#1A0A2E]">
                {query ? `Results for "${query}"` : pagesContent.search.resultsTitle}
              </h2>
            </div>
          </div>

          {results.length ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((post) => (
                <SearchResultCard key={post.id || post.slug} post={post} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-[#EEE5FF] bg-white p-12 text-center">
              <p className="text-xl font-extrabold tracking-[-0.02em] text-[#1A0A2E]">
                No matching posts found.
              </p>
              <p className="mt-3 text-sm leading-6 text-[#7A6B99]">
                Try a different keyword, content type, or category.
              </p>
            </div>
          )}
        </section>
      </main>
    </EditableSiteShell>
  )
}
