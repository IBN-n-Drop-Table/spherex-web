import { cx } from './classes'

/**
 * The project's mark: a laptop with Cassiopeia on its screen. Decorative (the name sits next to
 * it), so it is hidden from screen readers.
 */
export default function Logo({ className }: { className?: string }) {
  return <img src="/logo.svg" alt="" aria-hidden="true" draggable={false} className={cx('h-7 w-7 shrink-0 select-none', className)} />
}
