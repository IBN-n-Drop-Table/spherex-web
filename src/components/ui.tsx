import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon, InfoIcon, MinusIcon, WarningIcon } from './icons'
import { cx } from './classes'

// ---------------------------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------------------------

type Variant = 'primary' | 'secondary' | 'quiet'
type Size = 'sm' | 'md'

const BUTTON_BASE =
  'inline-flex select-none items-center justify-center gap-2 rounded-ctl font-medium transition-colors duration-150 disabled:opacity-45'
// Phones get 44 px targets; a mouse can live with less.
const BUTTON_SIZE: Record<Size, string> = {
  sm: 'min-h-11 px-3 text-xs md:min-h-8 md:px-2.5',
  md: 'min-h-11 px-4 text-sm md:min-h-9 md:px-3.5',
}
const BUTTON_VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-strong disabled:hover:bg-accent',
  secondary: 'border border-rule-strong bg-surface text-paper hover:border-muted hover:bg-raised',
  quiet: 'text-muted hover:bg-raised hover:text-paper',
}
const PRESSED = 'border border-accent bg-accent-wash text-accent hover:bg-accent-wash'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Toggle buttons: pass the state and it gets `aria-pressed` and the active look. */
  pressed?: boolean
}

/** The one button. Primary = the single main action of a screen; pressed = a toggle that is on. */
export function Button({ variant = 'secondary', size = 'md', pressed, className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cx(BUTTON_BASE, BUTTON_SIZE[size], pressed ? PRESSED : BUTTON_VARIANT[variant], className)}
      {...rest}
    />
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** What it does, for screen readers and as the tooltip. */
  label: string
  pressed?: boolean
}

/** A square button that only shows an icon; `label` is required. */
export function IconButton({ label, pressed, className, type = 'button', children, ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cx(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl transition-colors duration-150 disabled:opacity-40 md:h-8 md:w-8',
        pressed ? 'bg-accent-wash text-accent' : 'text-muted hover:bg-raised hover:text-paper',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/** A small rounded choice (suggested questions, quick picks). */
export function Chip({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cx(
        'min-h-11 rounded-full border border-rule-strong px-3 text-left text-xs text-muted transition-colors hover:border-muted hover:text-paper disabled:opacity-45 md:min-h-7',
        className,
      )}
      {...rest}
    />
  )
}

// ---------------------------------------------------------------------------------------------
// Segmented control
// ---------------------------------------------------------------------------------------------

interface SegmentedOption<T extends string> {
  id: T
  label: ReactNode
  title?: string
  disabled?: boolean
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T | null
  onChange: (id: T) => void
  /** Accessible name of the group. */
  label: string
  className?: string
}

/** A row of mutually exclusive choices; the active one takes the accent. */
export function Segmented<T extends string>({ options, value, onChange, label, className }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className={cx('inline-flex rounded-ctl border border-rule-strong', className)}>
      {options.map((o, i) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          disabled={o.disabled}
          title={o.title}
          className={cx(
            'min-h-11 whitespace-nowrap px-3 text-sm transition-colors duration-150 disabled:opacity-40 md:min-h-8',
            i > 0 && 'border-l border-rule-strong',
            value === o.id ? 'bg-accent-wash text-accent' : 'text-muted hover:bg-raised hover:text-paper',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------------------------

interface FieldProps {
  label: ReactNode
  /** Plain-words help shown under the control. */
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
}

/** A labelled control with its help text and its error. */
export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-2xs text-faint">{hint}</span>}
      {error && <span className="mt-1 block text-2xs text-danger">{error}</span>}
    </label>
  )
}

/** A checkbox with its label in plain words. */
export function Check({ checked, onChange, children, className }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex min-h-11 items-center gap-2 text-xs text-muted md:min-h-0', className)}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  )
}

// ---------------------------------------------------------------------------------------------
// Callout: the ONE treatment for caveats, warnings and errors
// ---------------------------------------------------------------------------------------------

type Tone = 'info' | 'caution' | 'error'
const TONE: Record<Tone, { box: string; icon: string }> = {
  info: { box: 'border-rule-strong bg-raised text-muted', icon: 'text-muted' },
  caution: { box: 'border-caution bg-caution-wash text-paper', icon: 'text-caution' },
  error: { box: 'border-danger bg-danger-wash text-paper', icon: 'text-danger' },
}

interface CalloutProps {
  tone?: Tone
  children: ReactNode
  /** Something to do about it (a "why?" toggle, a retry button). */
  action?: ReactNode
  className?: string
  /** Announce it to screen readers when it appears (errors). */
  live?: boolean
}

/**
 * A note set apart by a coloured rule on its left edge, like a margin note. Scientific caveats
 * use `caution`; failures use `error`; neutral explanations use `info`.
 */
export function Callout({ tone = 'info', children, action, className, live }: CalloutProps) {
  const t = TONE[tone]
  return (
    <div role={live ? 'alert' : undefined} className={cx('flex gap-2 border-l-2 px-2.5 py-2 text-xs leading-snug', t.box, className)}>
      <span className={cx('mt-px shrink-0', t.icon)}>{tone === 'info' ? <InfoIcon className="h-4 w-4" /> : <WarningIcon className="h-4 w-4" />}</span>
      <div className="min-w-0 flex-1">
        {children}
        {action && <div className="mt-1.5">{action}</div>}
      </div>
    </div>
  )
}

/** Underlined text button used inside sentences ("why?", "Go to it"). */
export function LinkButton({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cx('text-accent underline decoration-accent/50 underline-offset-2 hover:decoration-accent', className)} {...rest} />
}

// ---------------------------------------------------------------------------------------------
// Panel: the shell of everything that opens in the dock
// ---------------------------------------------------------------------------------------------

/** What a panel needs from the dock that holds it. */
export interface DockControls {
  onClose: () => void
  minimised?: boolean
  onMinimise?: () => void
}

interface PanelProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Extra controls in the header, before the close button. */
  actions?: ReactNode
  onClose: () => void
  /** Phones: collapse to the header so the image stays visible. */
  minimised?: boolean
  onMinimise?: () => void
  /** Offer "minimise" on wide screens too (by default it is a phone-only control). */
  minimiseEverywhere?: boolean
  children: ReactNode
  className?: string
  /** No padding around the body (lists that run edge to edge). */
  flush?: boolean
}

/** Header (title, actions, minimise, close) over a scrolling body. Fills the space it is given. */
export function Panel({ title, subtitle, actions, onClose, minimised = false, onMinimise, minimiseEverywhere, children, className, flush }: PanelProps) {
  return (
    <section className={cx('flex min-h-0 flex-col bg-surface', className)}>
      <header className="flex shrink-0 items-start gap-2 border-b border-rule px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg leading-6 text-paper">{title}</h2>
          {subtitle && !minimised && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {actions}
        {onMinimise && (
          <IconButton label={minimised ? 'Show the panel' : 'Minimise: see what is behind'} onClick={onMinimise} className={cx(minimised && 'w-auto px-2 md:w-auto', !minimiseEverywhere && 'md:hidden')}>
            {minimised ? <span className="label-caps">Show</span> : <MinusIcon />}
          </IconButton>
        )}
        <IconButton label="Close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </header>
      {!minimised && <div className={cx('min-h-0 flex-1 overflow-y-auto', !flush && 'p-4')}>{children}</div>}
    </section>
  )
}

// ---------------------------------------------------------------------------------------------
// Dialog: one portal dialog for the game and the cards
// ---------------------------------------------------------------------------------------------

interface DialogProps {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  /** Max width class of the dialog box. */
  width?: string
  /** Stack above another dialog. */
  raised?: boolean
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Modal dialog: Escape and the backdrop close it, focus stays inside and returns where it was. */
export function Dialog({ title, onClose, children, width = 'max-w-2xl', raised = false }: DialogProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const latestClose = useRef(onClose)
  useEffect(() => {
    latestClose.current = onClose
  })

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    boxRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      const box = boxRef.current
      if (!box) return
      // Only the top-most dialog reacts.
      const dialogs = document.querySelectorAll('[data-dialog]')
      if (dialogs[dialogs.length - 1] !== box) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        latestClose.current()
      } else if (e.key === 'Tab') {
        const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)]
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      before?.focus?.()
    }
  }, [])

  return createPortal(
    <div className={cx('fixed inset-0 flex items-end justify-center bg-black/70 sm:items-center sm:p-4', raised ? 'z-[60]' : 'z-50')} onClick={onClose}>
      <div
        ref={boxRef}
        data-dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className={cx('flex max-h-[94dvh] w-full animate-rise flex-col border border-rule-strong bg-surface shadow-dialog outline-none', width)}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-rule px-4 py-2.5">
          <h2 id={titleId} className="font-display text-xl text-paper">
            {title}
          </h2>
          <IconButton label="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/** A tiny coloured dot for legends (the fonts have no "●"). */
export function Dot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden="true" className={cx('inline-block h-2 w-2 rounded-full align-baseline', className)} style={{ background: color }} />
}
