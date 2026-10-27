import type {
  ApiError,
  CoverCandidate,
  CoverSearchQuery,
  CoverUploadResult,
  ImportResult,
  Item,
  ItemCreate,
  ItemPatch,
  Location,
  LocationCreate,
  LocationPatch,
} from '@stacks/shared';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, headers: { accept: 'application/json' } };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { ...init.headers, 'content-type': 'application/json' };
  }
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiRequestError(0, 'network', 'Can’t reach Stacks. Check your connection.');
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok) {
    const err = (data as ApiError | null)?.error;
    throw new ApiRequestError(
      res.status,
      err?.code ?? 'unknown',
      err?.message ?? 'Something went wrong.',
      err?.fields,
    );
  }
  return data as T;
}

export const api = {
  items: {
    list: () => request<{ items: Item[] }>('GET', '/api/items').then((r) => r.items),
    create: (input: ItemCreate & { title: string }) => request<Item>('POST', '/api/items', input),
    update: (id: string, patch: ItemPatch) => request<Item>('PATCH', `/api/items/${id}`, patch),
    remove: (id: string) => request<void>('DELETE', `/api/items/${id}`),
    restore: (id: string) => request<Item>('POST', `/api/items/${id}/restore`),
  },
  locations: {
    list: () => request<{ locations: Location[] }>('GET', '/api/locations').then((r) => r.locations),
    create: (input: LocationCreate) => request<Location>('POST', '/api/locations', input),
    update: (id: string, patch: LocationPatch) => request<Location>('PATCH', `/api/locations/${id}`, patch),
    remove: (id: string) =>
      request<{ deleted: string[]; movedItems: number }>('DELETE', `/api/locations/${id}`),
  },
  covers: {
    upload: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<CoverUploadResult>('POST', '/api/covers', form);
    },
    importUrl: (url: string) => request<CoverUploadResult>('POST', '/api/covers/import', { url }),
    search: (query: CoverSearchQuery) =>
      request<{ results: CoverCandidate[] }>('GET', `/api/covers/search?${new URLSearchParams(query)}`).then(
        (r) => r.results,
      ),
  },
  importLibrary: (data: unknown) => request<ImportResult>('POST', '/api/import', data),
};

export const coverUrl = (name: string) => `/covers/${name}`;
