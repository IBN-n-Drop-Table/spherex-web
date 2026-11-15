/** Joins class names, dropping the falsy ones. */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

/** Class for inputs, selects and textareas. */
export const fieldClass =
  'w-full rounded-ctl border border-rule-strong bg-sunken px-2.5 py-2 text-sm text-paper placeholder:text-faint focus:border-accent md:py-1.5'

const BTN = 'inline-flex select-none items-center justify-center gap-2 rounded-ctl font-medium transition-colors duration-150 disabled:opacity-45 min-h-11 px-4 text-sm md:min-h-9 md:px-3.5'
/** The primary / secondary button looks, as class strings (the <Button> component uses the same). */
export const btnPrimary = `${BTN} bg-accent text-accent-ink hover:bg-accent-strong`
export const btnSecondary = `${BTN} border border-rule-strong bg-surface text-paper hover:border-muted hover:bg-raised`
