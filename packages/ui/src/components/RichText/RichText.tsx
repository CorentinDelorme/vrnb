import type { HTMLAttributes } from 'react';

export interface RichTextProps extends HTMLAttributes<HTMLDivElement> {
  /** HTML content to render (from Payload's serialized richText) */
  content?: string;
  /** Alternative: React children for pre-rendered content */
  children?: React.ReactNode;
}

/** Component for rendering Payload richText content with Tailwind typography */
export function RichText({
  content,
  children,
  className = '',
  ...props
}: RichTextProps) {
  if (children) {
    return (
      <div className={`prose max-w-none ${className}`} {...props}>
        {children}
      </div>
    );
  }

  if (content) {
    return (
      <div
        className={`prose max-w-none ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
        {...props}
      />
    );
  }

  return null;
}
