import type { ReactNode } from 'react'
import { cx } from './classes'

export interface Tool {
  id: string
  /** Full name, shown beside the icon on wide screens. */
  label: string
  /** One or two words for the tab bar on phones. */
  short: string
  /** What it does, in plain words: shown under the label on wide screens. */
  hint: string
  icon: ReactNode
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

export interface ToolGroup {
  label: string
  tools: Tool[]
}

interface Props {
  groups: ToolGroup[]
  /** Shown above the tools on wide screens (for example, what object the data is about). */
  header?: ReactNode
  label?: string
}

/**
 * The tools of a view. Wide screens: a rail on the left with icon, name and a plain-words hint.
 * Phones: a tab bar along the bottom, within reach of the thumb.
 */
export default function ToolRail({ groups, header, label = 'Tools' }: Props) {
  return (
    <nav
      aria-label={label}
      className="order-last z-20 flex shrink-0 border-t border-rule bg-surface md:order-first md:w-60 md:flex-col md:overflow-y-auto md:border-r md:border-t-0"
    >
      {header && <div className="hidden border-b border-rule md:block">{header}</div>}
      {groups.map((g, gi) => (
        <div key={g.label} className={cx('contents md:block md:px-2', gi === 0 ? 'md:pt-3' : 'md:pt-4', gi === groups.length - 1 && 'md:pb-3')}>
          <div className="label-caps hidden px-2 pb-1 text-faint md:block">{g.label}</div>
          {g.tools.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={t.onClick}
              disabled={t.disabled}
              aria-pressed={t.active ?? false}
              title={t.hint}
              className={cx(
                'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-2xs transition-colors duration-150 disabled:opacity-40',
                'md:min-h-0 md:w-full md:flex-none md:flex-row md:items-start md:justify-start md:gap-3 md:rounded-ctl md:px-2 md:py-2 md:text-left md:text-sm',
                t.active ? 'bg-accent-wash text-accent' : 'text-muted hover:bg-raised hover:text-paper',
              )}
            >
              <span className="shrink-0 md:mt-0.5">{t.icon}</span>
              <span className="min-w-0">
                <span className="block md:hidden">{t.short}</span>
                <span className={cx('hidden md:block', t.active ? 'text-accent' : 'text-paper')}>{t.label}</span>
                <span className="hidden text-2xs leading-snug text-faint md:block">{t.hint}</span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </nav>
  )
}
