import { Skeleton } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import { useMatches } from 'react-router-dom'

interface PageProps {
  /** پیش‌فرض: عنوان صفحه از تعریف ماژول */
  title?: ReactNode
  description?: ReactNode
  /** دکمه‌های اصلی صفحه (سمت چپ عنوان) */
  actions?: ReactNode
  children: ReactNode
}

/** قالب هر صفحه: عنوان + توضیح + اکشن‌ها */
export function Page({ title, description, actions, children }: PageProps) {
  const handle = useMatches().at(-1)?.handle as { title?: string; description?: string } | undefined
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">{title ?? handle?.title}</h1>
          {(description ?? handle?.description) && <p className="page-desc">{description ?? handle?.description}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

interface SectionCardProps {
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  /** شماره مرحله (برای فرم‌های چندمرحله‌ای) */
  step?: number
  extra?: ReactNode
  footer?: ReactNode
  /** بدنه بدون padding افقی (برای جدول‌های تمام‌عرض) */
  flush?: boolean
  loading?: boolean
  children?: ReactNode
  style?: CSSProperties
  className?: string
}

/** کارت بخش‌بندی محتوا */
export function SectionCard({ title, description, icon, step, extra, footer, flush, loading, children, style, className }: SectionCardProps) {
  const hasHead = title || description || extra
  return (
    <section className={`section ${className ?? ''}`} style={style}>
      {hasHead && (
        <header className="section-head">
          <div className="section-head-main">
            {step !== undefined ? <span className="section-step">{step.toLocaleString('fa-IR')}</span> : icon && <span className="section-icon">{icon}</span>}
            <div>
              {title && <h2 className="section-title">{title}</h2>}
              {description && <p className="section-desc">{description}</p>}
            </div>
          </div>
          {extra && <div className="page-actions">{extra}</div>}
        </header>
      )}
      <div className={`section-body${flush ? ' flush' : ''}`}>{loading ? <Skeleton active /> : children}</div>
      {footer && <footer className="section-foot">{footer}</footer>}
    </section>
  )
}

export function Grid({ min = 240, gap = 16, children, style }: { min?: number; gap?: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="grid-auto" style={{ ['--min' as string]: `${min}px`, gap, ...style }}>
      {children}
    </div>
  )
}

export function Callout({ tone = 'neutral', children, style }: { tone?: 'neutral' | 'accent' | 'danger' | 'success'; children: ReactNode; style?: CSSProperties }) {
  return <div className={`callout ${tone}`} style={style}>{children}</div>
}
