import type { ReactNode } from 'react'

/** **bold** inside a line. Everything else stays literal text (nothing is ever parsed as HTML). */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-semibold text-slate-50">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
}

type Block = { kind: 'p'; lines: string[] } | { kind: 'ol' | 'ul'; items: string[] }

const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const BULLET = /^\s*[-*•]\s+(.*)$/
const HEADING = /^\s*#{1,6}\s+(.*)$/

function parse(text: string): Block[] {
  const blocks: Block[] = []
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    if (!raw.trim()) {
      blocks.push({ kind: 'p', lines: [] }) // a blank line closes the current paragraph / list
      continue
    }
    const num = NUMBERED.exec(raw)
    const bul = num ? null : BULLET.exec(raw)
    const head = num || bul ? null : HEADING.exec(raw)
    const last = blocks[blocks.length - 1]
    if (num || bul) {
      const kind = num ? 'ol' : 'ul'
      const item = (num ?? bul)![1]
      if (last && last.kind === kind) last.items.push(item)
      else blocks.push({ kind, items: [item] })
    } else {
      const line = head ? `**${head[1].replace(/\*\*/g, '')}**` : raw.trim()
      if (last && last.kind === 'p' && last.lines.length > 0) last.lines.push(line)
      else if (last && last.kind === 'p') last.lines.push(line)
      else blocks.push({ kind: 'p', lines: [line] })
    }
  }
  return blocks.filter(b => (b.kind === 'p' ? b.lines.length > 0 : b.items.length > 0))
}

/** An assistant answer: the bits of Markdown the models actually use (bold, lists, paragraphs). */
export default function ChatText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {parse(text).map((b, i) =>
        b.kind === 'p' ? (
          <p key={i}>
            {b.lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </span>
            ))}
          </p>
        ) : b.kind === 'ol' ? (
          <ol key={i} className="list-decimal space-y-0.5 pl-5">
            {b.items.map((it, j) => (
              <li key={j}>{inline(it)}</li>
            ))}
          </ol>
        ) : (
          <ul key={i} className="list-disc space-y-0.5 pl-5">
            {b.items.map((it, j) => (
              <li key={j}>{inline(it)}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}
