import React from 'react'

import type { Media } from '@/payload-types'

/** Extract text content recursively from a Payload lexical node */
export function extractText(node: Record<string, unknown>): string {
  if (typeof node.text === 'string') return node.text
  if (Array.isArray(node.children)) {
    return node.children.map((child: Record<string, unknown>) => extractText(child)).join('')
  }
  return ''
}

/** Render Payload richText (lexical JSON) content as HTML */
export function RichTextContent({ content }: { content: unknown }) {
  if (!content) return null

  const data = content as { root?: { children?: Array<Record<string, unknown>> } }
  if (!data?.root?.children) return null

  return React.createElement(
    'div',
    { className: 'prose max-w-none' },
    data.root.children.map((node, i) => {
      if (node.type === 'heading') {
        const text = extractText(node)
        const tag = (node.tag as string) || 'h2'
        if (tag === 'h1') return React.createElement('h1', { key: i }, text)
        if (tag === 'h3') return React.createElement('h3', { key: i }, text)
        if (tag === 'h4') return React.createElement('h4', { key: i }, text)
        return React.createElement('h2', { key: i }, text)
      }
      if (node.type === 'paragraph') {
        const text = extractText(node)
        if (!text) return null
        return React.createElement('p', { key: i }, text)
      }
      if (node.type === 'list') {
        const listTag = node.listType === 'number' ? 'ol' : 'ul'
        const children = (node.children as Array<Record<string, unknown>> | undefined)?.map(
          (item, j) => React.createElement('li', { key: j }, extractText(item)),
        )
        return React.createElement(listTag, { key: i }, children)
      }
      return null
    }),
  )
}

/** Get media URL helper */
export function getMediaUrl(media: string | Media | null | undefined): string | null {
  if (!media || typeof media === 'string') return null
  return media.url ?? null
}

/** Get media alt text helper */
export function getMediaAlt(media: string | Media | null | undefined): string {
  if (!media || typeof media === 'string') return ''
  return media.alt || ''
}

/** Format a date for display in French */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Format time from a date string */
export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Format only the short date */
export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
