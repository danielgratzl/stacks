import type { Item, MediaType, ReadStatus } from '@stacks/shared';
import { Book, BookCheck, BookMarked, BookOpen, Disc3, type LucideIcon } from 'lucide-react';

export const MEDIA: Record<
  MediaType,
  {
    label: string;
    one: string;
    many: string;
    creators: string;
    creator: string;
    publisher: string;
    icon: LucideIcon;
    path: string;
  }
> = {
  book: {
    label: 'Books',
    one: 'book',
    many: 'books',
    creators: 'Author(s)',
    creator: 'Author',
    publisher: 'Publisher',
    icon: BookOpen,
    path: '/books',
  },
  vinyl: {
    label: 'Vinyl',
    one: 'record',
    many: 'records',
    creators: 'Artist(s)',
    creator: 'Artist',
    publisher: 'Label',
    icon: Disc3,
    path: '/vinyl',
  },
};

export const READ_STATUS: Record<ReadStatus, { label: string; icon: LucideIcon }> = {
  unread: { label: 'Unread', icon: Book },
  'want-to-read': { label: 'Want to read', icon: BookMarked },
  read: { label: 'Read', icon: BookCheck },
};

export const LANGUAGES = [
  'English',
  'German',
  'French',
  'Italian',
  'Spanish',
  'Portuguese',
  'Dutch',
  'Swedish',
  'Japanese',
  'Instrumental',
];

export const isWish = (i: Pick<Item, 'status'>) => i.status === 'wishlist';
export const creatorsText = (i: Pick<Item, 'creators'>) => i.creators.join(', ');
export const lentLabel = (i: Pick<Item, 'loan'>) =>
  i.loan ? (i.loan.to ? `Lent to ${i.loan.to}` : 'Lent out') : '';
