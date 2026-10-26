import type { MediaType } from '@stacks/shared';
import { ImagePlus, Link2, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { CoverArt } from './CoverArt';

const looksLikeUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

/**
 * Upload by click, drop or paste, or import from a web address. Uploads start immediately
 * and the server returns the stored file name.
 */
export function CoverPicker({
  type,
  title,
  value,
  onChange,
  onBusyChange,
}: {
  type: MediaType;
  title: string;
  value: string | null;
  onChange: (cover: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const run = async (task: () => Promise<{ cover: string }>, localPreview?: string) => {
    setError(null);
    setBusy(true);
    if (localPreview) setPreview(localPreview);
    try {
      const { cover } = await task();
      onChange(cover);
      setUrlMode(false);
      setUrl('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      setPreview(null);
    }
  };
  const uploadFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Choose an image file, like a JPG, PNG or WebP.');
    void run(() => api.covers.upload(file), URL.createObjectURL(file));
  };
  const importUrl = (raw: string) => {
    if (!looksLikeUrl(raw)) return setError('Enter a full web address, starting with https://');
    void run(() => api.covers.importUrl(raw.trim()));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) return uploadFile(file);
    // An image dragged from another browser tab arrives as a URL.
    const link = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (looksLikeUrl(link)) importUrl(link.split('\n')[0]!);
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const file = [...e.clipboardData.files].find((f) => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      uploadFile(file);
    }
  };

  const ratio = type === 'vinyl' ? '1 / 1' : '2 / 3';
  return (
    <div onPaste={onPaste}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={cn(
          'group relative mx-auto w-full max-w-[160px] transition-transform duration-200',
          drag && 'scale-[1.03]',
        )}
      >
        {preview ? (
          <div className="relative overflow-hidden rounded-md" style={{ aspectRatio: ratio }}>
            <img src={preview} alt="" className="h-full w-full object-cover opacity-60" />
            <div className="absolute inset-0 grid place-items-center">
              <Loader2 className="size-6 animate-spin text-white drop-shadow" />
            </div>
          </div>
        ) : value ? (
          <CoverArt
            item={{ type, title, creators: [], cover: value, status: 'owned', loan: null, seriesNumber: '' }}
            peek="always"
          />
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            style={{ aspectRatio: ratio }}
            className={cn(
              'text-muted-foreground hover:border-foreground/40 hover:bg-accent/60 focus-visible:ring-ring/50 flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-center text-xs outline-none transition-colors focus-visible:ring-[3px]',
              drag ? 'border-foreground/60 bg-accent' : 'border-input',
            )}
          >
            {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
            <span className="px-3 leading-snug">
              <span className="text-foreground font-medium">{busy ? 'Importing…' : 'Add cover'}</span>
              {!busy && (
                <>
                  <br />
                  drop or paste an image
                </>
              )}
            </span>
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-x-0.5">
        {value && !busy && (
          <>
            <Button size="sm" variant="ghost" className="px-2" onClick={() => fileRef.current?.click()}>
              Replace
            </Button>
            <Button size="sm" variant="quiet" className="px-2" onClick={() => onChange(null)}>
              Remove
            </Button>
          </>
        )}
        {!urlMode && !busy && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setUrlMode(true)}
          >
            <Link2 />
            From a link
          </Button>
        )}
      </div>

      {urlMode && (
        <div className="anim-fade mt-2 flex gap-1.5">
          <Input
            autoFocus
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={url}
            disabled={busy}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Not a nested form: the picker lives inside the item form.
                e.preventDefault();
                importUrl(url);
              }
              if (e.key === 'Escape') {
                e.stopPropagation();
                setUrlMode(false);
              }
            }}
            aria-label="Image address"
            className="h-8"
          />
          <Button size="sm" disabled={busy || !url.trim()} onClick={() => importUrl(url)}>
            {busy ? <Loader2 className="animate-spin" /> : 'Import'}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="anim-shake text-destructive mt-2 text-center text-xs">
          {error}
        </p>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          uploadFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
