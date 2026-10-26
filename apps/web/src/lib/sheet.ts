import type { MediaType } from '@stacks/shared';
import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

export type SheetState =
  | { mode: 'view' | 'edit'; id: string }
  | {
      mode: 'add';
      type: MediaType;
      wishlist: boolean;
      seriesName?: string;
      seriesNumber?: string;
      creator?: string;
    }
  | null;

const SHEET_KEYS = ['item', 'edit', 'add', 'wish', 'series', 'no', 'by'];

/** The item sheet lives in the URL, so it can be linked and closed with the back button. */
export function useSheet() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const item = params.get('item');
  const add = params.get('add');
  let state: SheetState = null;
  if (item) state = { mode: params.get('edit') ? 'edit' : 'view', id: item };
  else if (add === 'book' || add === 'vinyl')
    state = {
      mode: 'add',
      type: add,
      wishlist: params.get('wish') === '1',
      seriesName: params.get('series') ?? undefined,
      seriesNumber: params.get('no') ?? undefined,
      creator: params.get('by') ?? undefined,
    };

  const go = useCallback(
    (next: Record<string, string>, replace = false) => {
      const p = new URLSearchParams(params);
      SHEET_KEYS.forEach((k) => p.delete(k));
      Object.entries(next).forEach(([k, v]) => v && p.set(k, v));
      setParams(p, { replace, state: replace ? location.state : { sheet: true } });
    },
    [params, setParams, location.state],
  );

  return {
    state,
    open: (id: string) => go({ item: id }, !!state),
    edit: (id: string) => go({ item: id, edit: '1' }, true),
    view: (id: string) => go({ item: id }, true),
    add: (
      type: MediaType,
      opts: { wishlist?: boolean; seriesName?: string; seriesNumber?: string; creator?: string } = {},
    ) =>
      go(
        {
          add: type,
          wish: opts.wishlist ? '1' : '',
          series: opts.seriesName ?? '',
          no: opts.seriesNumber ?? '',
          by: opts.creator ?? '',
        },
        !!state,
      ),
    close: () => {
      if ((location.state as { sheet?: boolean } | null)?.sheet) navigate(-1);
      else go({}, true);
    },
  };
}
