import { normalizeText } from '@stacks/shared';
import { Plus, Tag, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Free-text list input with suggestions; Enter or comma adds, Backspace removes the last. */
export function ChipInput({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
  variant = 'plain',
}: {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  variant?: 'plain' | 'tag';
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const chosen = useMemo(() => new Set(value.map(normalizeText)), [value]);
  const query = normalizeText(text.trim());
  const matches = useMemo(
    () =>
      suggestions
        .filter((s) => !chosen.has(normalizeText(s)) && (!query || normalizeText(s).includes(query)))
        .slice(0, 6),
    [suggestions, chosen, query],
  );
  const isNew = !!query && !chosen.has(query) && !suggestions.some((s) => normalizeText(s) === query);
  const listId = id ? `${id}-suggestions` : undefined;

  const add = (v: string) => {
    const clean = v.trim();
    if (clean && !chosen.has(normalizeText(clean))) onChange([...value, clean]);
    setText('');
    setHighlight(-1);
  };
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (highlight >= 0 && matches[highlight]) add(matches[highlight]);
      else if (text.trim()) add(text);
    } else if (e.key === 'Backspace' && !text && value.length) remove(value.length - 1);
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  const Icon = variant === 'tag' ? Tag : null;
  return (
    <div className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className="border-input shadow-xs focus-within:border-ring focus-within:ring-ring/30 dark:bg-input/20 flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 transition-[border-color,box-shadow] focus-within:ring-[3px]"
      >
        {value.map((v, i) => (
          <span
            key={v}
            className="anim-pop bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-md py-0.5 pl-2 pr-1 text-[13px] font-medium"
          >
            {Icon && <Icon className="size-3 opacity-60" />}
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(i);
              }}
              className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground grid size-4 place-items-center rounded-sm transition-colors"
            >
              <X className="size-3" strokeWidth={2.2} />
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={inputRef}
          value={text}
          placeholder={value.length ? '' : placeholder}
          role="combobox"
          aria-expanded={open && (matches.length > 0 || isNew)}
          aria-controls={listId}
          autoComplete="off"
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() =>
            setTimeout(() => {
              setOpen(false);
              if (text.trim()) add(text);
            }, 120)
          }
          onKeyDown={onKeyDown}
          className="placeholder:text-muted-foreground/80 h-6 min-w-[8ch] flex-1 bg-transparent px-1 text-base outline-none md:text-sm"
        />
      </div>
      {open && (matches.length > 0 || isNew) && (
        <div
          id={listId}
          role="listbox"
          className="anim-fade bg-popover text-popover-foreground absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border p-1 shadow-lg"
        >
          {matches.map((m, i) => (
            <button
              key={m}
              type="button"
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                add(m);
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                i === highlight ? 'bg-accent' : 'hover:bg-accent',
              )}
            >
              {Icon && <Icon className="text-muted-foreground size-3.5" />}
              {m}
            </button>
          ))}
          {isNew && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                add(text);
              }}
              className="text-muted-foreground hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
            >
              <Plus className="size-3.5" />
              Create <span className="text-foreground font-medium">“{text.trim()}”</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
