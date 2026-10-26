# Barcode scanning and metadata lookup (planned)

Goal: point a phone at a book’s ISBN or a record’s barcode, or type a title and author or artist, and get the fields and cover filled in for review before saving.

## User flow

1. In the add form, a **Scan** button opens the camera. On a match it fills the barcode field and starts a lookup.
2. Alternatively, **Look up** searches by barcode, or by title plus author or artist.
3. Results appear as a short list of candidates with covers. Picking one fills the form; nothing is saved until the user confirms.
4. A matching cover is imported through the existing `POST /api/covers/import`, so it gets the same re-encoding and safety checks as any other link.

## Scanning in the browser

- **Camera access needs a secure context.** Phones must reach Stacks over HTTPS (see “HTTPS and remote access” in the README). `localhost` works for development. The server already sends `Permissions-Policy: camera=(self)`.
- **Detection:** use the native `BarcodeDetector` API where available (Chrome on Android) and fall back to `zxing-wasm` elsewhere, notably iOS Safari. Load the fallback only when needed, as a dynamic import.
- **Formats:** EAN-13 (ISBN-13 books, most records), UPC-A (US records), EAN-8. Convert ISBN-10 to ISBN-13 and validate check digits before looking up.

## Lookup on the server

Lookups go through the server, not the browser: some APIs require a custom User-Agent or a token, results can be cached, and rate limits can be respected in one place.

Proposed endpoint: `GET /api/lookup?type=book|vinyl&barcode=…` or `&q=…&creator=…`, returning normalised candidates:

```ts
interface LookupCandidate {
  source: 'openlibrary' | 'musicbrainz' | 'discogs' | 'googlebooks';
  sourceId: string;
  type: 'book' | 'vinyl';
  title: string;
  subtitle?: string;
  creators: string[];
  publisher?: string;
  originalYear?: number;
  editionYear?: number;
  language?: string;
  barcode?: string;
  seriesName?: string;
  seriesNumber?: string;
  coverUrl?: string;
}
```

Implement each source as a provider behind a small interface, and cache responses in SQLite for a few weeks.

### Books

| Source                                                 | Cost and access            | Notes                                                                                                                                                                                                                   |
| ------------------------------------------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Open Library](https://openlibrary.org/developers/api) | Free, no key               | `/isbn/{isbn}.json` for editions, `/search.json` for title and author. The work record gives the original year; the edition gives the edition year. Covers via `covers.openlibrary.org`. Send a descriptive User-Agent. |
| Google Books API                                       | Free tier, key recommended | Good fallback coverage, especially for non-English titles. Optional, enabled when a key is configured.                                                                                                                  |

### Records

| Source                                                     | Cost and access      | Notes                                                                                                                                                                                                                      |
| ---------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API) | Free, no key         | Release search supports `barcode:`. Requires a meaningful User-Agent and allows about one request per second, so queue requests. The release group gives the original year; the release gives the pressing year and label. |
| [Cover Art Archive](https://coverartarchive.org/)          | Free, no key         | Covers by MusicBrainz release id.                                                                                                                                                                                          |
| [Discogs](https://www.discogs.com/developers)              | Free, personal token | Excellent vinyl coverage, including pressings. Optional, enabled when `DISCOGS_TOKEN` is set. Respect its rate limit.                                                                                                      |

Check each provider’s current terms and rate limits when implementing; they change over time.

## Configuration to add

| Variable               | Purpose                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `LOOKUP_CONTACT`       | Contact (email or URL) for the User-Agent, which MusicBrainz and Open Library ask for. |
| `DISCOGS_TOKEN`        | Enables the Discogs provider.                                                          |
| `GOOGLE_BOOKS_API_KEY` | Enables the Google Books provider.                                                     |

## Out of scope for the first version

Bulk scanning sessions, automatic duplicate detection by barcode (worth adding soon after: warn when a scanned barcode is already in the library), and offline lookups.
