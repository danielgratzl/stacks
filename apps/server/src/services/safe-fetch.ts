import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import { Agent, fetch } from 'undici';
import { AppError } from '../lib/errors';

const blocked = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  blocked.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const)
  blocked.addSubnet(net, prefix, 'ipv6');

/** True for loopback, private, link-local and other non-public addresses. */
export function isPrivateAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return blocked.check(mapped[1]!, 'ipv4');
  const family = isIP(address);
  if (family === 4) return blocked.check(address, 'ipv4');
  if (family === 6) return blocked.check(address, 'ipv6');
  return true;
}

const forbidden = () =>
  new AppError(422, 'forbidden_address', 'That address points to a private network, which isn’t allowed.');

/** DNS lookup that refuses private addresses, checked at connect time (no rebinding window). */
const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '', 0);
    const list = addresses as LookupAddress[];
    if (!list.length || list.some((a) => isPrivateAddress(a.address))) {
      return callback(Object.assign(forbidden(), { code: 'EFORBIDDEN' }), '', 0);
    }
    if (options.all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, list);
    callback(null, list[0]!.address, list[0]!.family);
  });
};

const publicAgent = new Agent({ connect: { lookup: safeLookup } });
const anyAgent = new Agent();

export interface FetchImageOptions {
  allowPrivate: boolean;
  maxBytes: number;
  timeoutMs: number;
}

/** Downloads an image from a user-supplied URL with SSRF, size and time limits. */
export async function fetchImage(rawUrl: string, opts: FetchImageOptions): Promise<Buffer> {
  let url = new URL(rawUrl);
  const signal = AbortSignal.timeout(opts.timeoutMs);
  for (let hop = 0; hop < 5; hop++) {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new AppError(422, 'unsupported_url', 'Only http and https addresses can be imported.');
    }
    if (url.username || url.password) {
      throw new AppError(422, 'unsupported_url', 'Addresses with credentials can’t be imported.');
    }
    const host = url.hostname.replace(/^\[|\]$/g, '');
    if (!opts.allowPrivate && (isIP(host) ? isPrivateAddress(host) : host === 'localhost')) throw forbidden();

    let response;
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal,
        dispatcher: opts.allowPrivate ? anyAgent : publicAgent,
        headers: {
          'user-agent': 'Stacks/0.1 (self-hosted media library)',
          accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
        },
      });
    } catch (error) {
      const cause = (error as { cause?: unknown }).cause;
      if (cause instanceof AppError) throw cause;
      if (signal.aborted) throw new AppError(504, 'timeout', 'The image took too long to download.');
      throw new AppError(502, 'fetch_failed', 'Couldn’t reach that address. Check the link and try again.');
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) break;
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new AppError(502, 'fetch_failed', `The address answered with an error (${response.status}).`);
    }
    const type = response.headers.get('content-type') ?? '';
    if (type && !/^image\/|^application\/octet-stream|^binary\//i.test(type)) {
      await response.body?.cancel();
      throw new AppError(
        422,
        'not_an_image',
        'That address doesn’t point to an image. Copy the image address itself.',
      );
    }
    const declared = Number(response.headers.get('content-length') ?? 0);
    if (declared > opts.maxBytes) {
      await response.body?.cancel();
      throw new AppError(413, 'too_large', 'That image is too large to import.');
    }
    const chunks: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of response.body ?? []) {
      size += chunk.byteLength;
      if (size > opts.maxBytes) throw new AppError(413, 'too_large', 'That image is too large to import.');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  throw new AppError(502, 'fetch_failed', 'That address redirects too many times.');
}
