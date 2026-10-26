import type { Item, ItemFields, ItemPatch } from '@stacks/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { uniqueSorted } from '@/lib/format';
import { isWish, MEDIA } from '@/lib/media';
import {
  isFieldError,
  toastError,
  useCreateItem,
  useDeleteItem,
  useItems,
  useLocations,
  useUpdateItem,
} from '@/lib/queries';
import { useSheet } from '@/lib/sheet';
import { useHighlight } from '@/lib/highlight';
import { ItemDetail } from './ItemDetail';
import { toFormValues } from '@/lib/item-form';
import { ItemForm } from './ItemForm';

export function ItemSheet() {
  const sheet = useSheet();
  const navigate = useNavigate();
  const { data: items = [], isPending } = useItems();
  const { data: locations = [] } = useLocations();
  const create = useCreateItem();
  const update = useUpdateItem();
  const remove = useDeleteItem();
  const { flash } = useHighlight();
  const [serverErrors, setServerErrors] = useState<Record<string, string>>();

  const state = sheet.state;
  const item = state && state.mode !== 'add' ? items.find((i) => i.id === state.id) : undefined;
  const open = !!state && (state.mode === 'add' || !!item || isPending);

  const patch = (target: Item, changes: ItemPatch, message: string, undo = true) => {
    update.mutate(
      { id: target.id, patch: changes },
      {
        onSuccess: () => {
          flash(target.id);
          const restore: ItemPatch = {};
          for (const k of Object.keys(changes) as (keyof ItemPatch)[])
            Object.assign(restore, { [k]: target[k] });
          toast.success(
            message,
            undo
              ? { action: { label: 'Undo', onClick: () => update.mutate({ id: target.id, patch: restore }) } }
              : {},
          );
        },
        onError: toastError('Couldn’t save that change'),
      },
    );
  };

  let title = '';
  let body: React.ReactNode = null;
  if (state?.mode === 'add') {
    title = 'Add to library';
    body = (
      <ItemForm
        key={`add-${state.type}-${state.seriesName ?? ''}-${state.seriesNumber ?? ''}`}
        mode="add"
        items={items}
        locations={locations}
        saving={create.isPending}
        serverErrors={serverErrors}
        initial={toFormValues({
          type: state.type,
          status: state.wishlist ? 'wishlist' : 'owned',
          seriesName: state.seriesName ?? '',
          seriesNumber: state.seriesNumber ?? '',
          creators: state.creator ? [state.creator] : [],
        })}
        onSubmit={async (fields: ItemFields, addAnother) => {
          setServerErrors(undefined);
          try {
            const created = await create.mutateAsync(fields);
            flash(created.id);
            toast.success(
              isWish(created) ? `Added “${created.title}” to your wishlist` : `Added “${created.title}”`,
              {
                description: addAnother ? 'Ready for the next one' : undefined,
                action: addAnother ? undefined : { label: 'View', onClick: () => sheet.open(created.id) },
              },
            );
            if (!addAnother) sheet.close();
            return true;
          } catch (e) {
            if (isFieldError(e)) setServerErrors(e.fields);
            else toastError('Couldn’t add that')(e);
            return false;
          }
        }}
      />
    );
  } else if (state?.mode === 'edit' && item) {
    title = `Edit ${MEDIA[item.type].one}`;
    body = (
      <ItemForm
        key={`edit-${item.id}`}
        mode="edit"
        items={items}
        locations={locations}
        saving={update.isPending}
        serverErrors={serverErrors}
        initial={toFormValues(item)}
        onCancel={() => sheet.view(item.id)}
        onSubmit={async (fields) => {
          setServerErrors(undefined);
          try {
            const saved = await update.mutateAsync({ id: item.id, patch: fields });
            const moved = isWish(saved) !== isWish(item);
            if (moved) flash(item.id);
            toast.success(
              moved
                ? isWish(saved)
                  ? 'Moved to your wishlist'
                  : 'Moved to your collection'
                : 'Changes saved',
              {
                action: moved
                  ? {
                      label: 'Undo',
                      onClick: () => {
                        const { id: _i, addedAt: _a, createdAt: _c, updatedAt: _u, ...previous } = item;
                        update.mutate({ id: item.id, patch: previous });
                      },
                    }
                  : undefined,
              },
            );
            sheet.view(item.id);
            return true;
          } catch (e) {
            if (isFieldError(e)) setServerErrors(e.fields);
            else toastError('Couldn’t save changes')(e);
            return false;
          }
        }}
      />
    );
  } else if (item) {
    title = item.type === 'book' ? 'Book' : 'Record';
    body = (
      <ItemDetail
        key={`view-${item.id}`}
        item={item}
        locations={locations}
        borrowers={uniqueSorted(items.map((i) => i.loan?.to))}
        onEdit={() => sheet.edit(item.id)}
        onDelete={() => {
          sheet.close();
          remove.mutate(item);
        }}
        onSeries={(name) => navigate(`/books/series?focus=${encodeURIComponent(name)}`)}
        onLend={(loan) => patch(item, { loan }, loan.to ? `Lent to ${loan.to}` : 'Marked as lent')}
        onReturn={() => patch(item, { loan: null }, `“${item.title}” is back`)}
        onAcquire={() => patch(item, { status: 'owned' }, 'Moved to your collection')}
      />
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setServerErrors(undefined);
          sheet.close();
        }
      }}
    >
      <SheetContent aria-describedby={undefined}>
        <SheetHeader title={title || 'Item'} />
        <div key={state?.mode} className="anim-fade flex min-h-0 flex-1 flex-col">
          {body ??
            (isPending ? null : (
              <p className="text-muted-foreground p-6 text-sm">This item no longer exists.</p>
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
