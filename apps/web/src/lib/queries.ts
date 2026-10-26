import { normalizeItem, type Item, type ItemCreate, type ItemPatch, type Location } from '@stacks/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiRequestError } from './api';

export const keys = { items: ['items'] as const, locations: ['locations'] as const };

export const useItems = () => useQuery({ queryKey: keys.items, queryFn: api.items.list });
export const useLocations = () => useQuery({ queryKey: keys.locations, queryFn: api.locations.list });

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');
export const toastError = (title: string) => (e: unknown) =>
  toast.error(title, { description: errorMessage(e) });

const setItems = (qc: QueryClient, fn: (items: Item[]) => Item[]) =>
  qc.setQueryData<Item[]>(keys.items, (old) => fn(old ?? []));

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ItemCreate & { title: string }) => api.items.create(input),
    onSuccess: (item) => setItems(qc, (items) => [...items.filter((i) => i.id !== item.id), item]),
  });
}

/** Optimistic update; rolls back and reports if the server refuses. */
export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ItemPatch }) => api.items.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.items });
      const previous = qc.getQueryData<Item[]>(keys.items);
      setItems(qc, (items) =>
        items.map((i) => (i.id === id ? { ...i, ...normalizeItem({ ...i, ...patch } as Item) } : i)),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(keys.items, ctx.previous),
    onSuccess: (item) => setItems(qc, (items) => items.map((i) => (i.id === item.id ? item : i))),
  });
}

/** Deletes with an undo toast. */
export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: Item) => api.items.remove(item.id),
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: keys.items });
      const previous = qc.getQueryData<Item[]>(keys.items);
      setItems(qc, (items) => items.filter((i) => i.id !== item.id));
      return { previous };
    },
    onError: (e, _item, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.items, ctx.previous);
      toastError('Couldn’t delete that')(e);
    },
    onSuccess: (_r, item) =>
      toast(`Deleted “${item.title}”`, {
        duration: 7000,
        action: {
          label: 'Undo',
          onClick: () =>
            api.items
              .restore(item.id)
              .then((restored) => setItems(qc, (items) => [...items, restored]))
              .catch(toastError('Couldn’t restore that')),
        },
      }),
  });
}

export function useLocationMutations() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: keys.locations });
  return {
    create: useMutation({
      mutationFn: api.locations.create,
      onSuccess: (loc) => qc.setQueryData<Location[]>(keys.locations, (old) => [...(old ?? []), loc]),
      onError: toastError('Couldn’t add that location'),
    }),
    update: useMutation({
      mutationFn: ({ id, ...patch }: { id: string; name?: string; parentId?: string | null }) =>
        api.locations.update(id, patch),
      onMutate: ({ id, name }) => {
        if (name)
          qc.setQueryData<Location[]>(keys.locations, (old) =>
            old?.map((l) => (l.id === id ? { ...l, name } : l)),
          );
      },
      onError: (e) => {
        refresh();
        toastError('Couldn’t rename that location')(e);
      },
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.locations.remove(id),
      onSuccess: () => {
        refresh();
        qc.invalidateQueries({ queryKey: keys.items });
      },
      onError: toastError('Couldn’t delete that location'),
    }),
  };
}

export const isFieldError = (e: unknown): e is ApiRequestError =>
  e instanceof ApiRequestError && Object.keys(e.fields).length > 0;
