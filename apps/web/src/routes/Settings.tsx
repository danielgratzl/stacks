import { locationSubtree, locationTree, type Location, type LocationNode } from '@stacks/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Home, MapPin, Monitor, Moon, Pencil, Plus, Sun, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/AppShell';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { api } from '@/lib/api';
import { plural } from '@/lib/format';
import { isWish } from '@/lib/media';
import { errorMessage, keys, useItems, useLocationMutations, useLocations } from '@/lib/queries';
import { useTheme, type ThemePreference } from '@/lib/theme';

const indent = (depth: number) => ({ paddingLeft: 8 + depth * 22 });

function NewLocation({
  depth,
  placeholder,
  onSave,
  onCancel,
}: {
  depth: number;
  placeholder: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const save = () => {
    if (name.trim()) {
      onSave(name.trim());
      setName('');
    } else onCancel();
  };
  return (
    <div className="anim-fade flex h-11 items-center gap-2" style={indent(depth)}>
      {depth > 0 && <span className="bg-border h-px w-2.5" />}
      <Input
        autoFocus
        value={name}
        placeholder={placeholder}
        className="h-8 max-w-xs"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            save();
          }
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={() => !name.trim() && onCancel()}
      />
      <Button size="sm" onMouseDown={(e) => e.preventDefault()} onClick={save}>
        Add
      </Button>
    </div>
  );
}

function LocationRow({
  node,
  count,
  editing,
  setEditing,
  onRename,
  onAddChild,
  onDelete,
}: {
  node: LocationNode;
  count: number;
  editing: boolean;
  setEditing: (id: string | null) => void;
  onRename: (name: string) => void;
  onAddChild: () => void;
  onDelete: () => void;
}) {
  const [value, setValue] = useState(node.name);
  useEffect(() => setValue(node.name), [node.name, editing]);
  const commit = () => {
    const v = value.trim();
    if (v && v !== node.name) onRename(v);
    setEditing(null);
  };
  const Icon = node.depth === 0 ? Home : MapPin;
  return (
    <div
      className="hover:bg-accent/50 group flex h-10 items-center gap-2 rounded-md pr-1 transition-colors"
      style={indent(node.depth)}
    >
      {node.depth > 0 && <span className="bg-border h-px w-2.5" />}
      <Icon className="text-muted-foreground size-3.5" />
      {editing ? (
        <Input
          autoFocus
          value={value}
          className="h-8 max-w-xs"
          aria-label="Location name"
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(null);
          }}
        />
      ) : (
        <button
          type="button"
          title="Rename"
          onClick={() => setEditing(node.id)}
          className="focus-visible:ring-ring/50 min-w-0 truncate rounded-sm text-left text-sm font-medium outline-none focus-visible:ring-[3px]"
        >
          {node.name}
        </button>
      )}
      <span className="text-muted-foreground tnum text-xs">{count || ''}</span>
      <div className="ml-auto flex items-center transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onAddChild}
          aria-label={`Add inside ${node.name}`}
          title="Add inside"
        >
          <Plus />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditing(node.id)}
          aria-label={`Rename ${node.name}`}
          title="Rename"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="quiet"
          size="icon-sm"
          onClick={onDelete}
          aria-label={`Delete ${node.name}`}
          title="Delete"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function LocationsEditor() {
  const { data: locations = [] } = useLocations();
  const { data: items = [] } = useItems();
  const mutations = useLocationMutations();
  const [editing, setEditing] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null); // '' = root
  const [pendingDelete, setPendingDelete] = useState<{
    node: Location;
    items: number;
    children: number;
  } | null>(null);
  const tree = locationTree(locations);
  const owned = items.filter((i) => !isWish(i));
  const countIn = (id: string) => {
    const ids = locationSubtree(locations, id);
    return owned.filter((i) => i.locationId && ids.has(i.locationId)).length;
  };

  const remove = (node: Location) =>
    mutations.remove.mutate(node.id, { onSuccess: () => toast.success(`Deleted “${node.name}”`) });
  const askDelete = (node: Location) => {
    const children = locationSubtree(locations, node.id).size - 1;
    const n = countIn(node.id);
    if (!children && !n) remove(node);
    else setPendingDelete({ node, items: n, children });
  };
  const parentName = (node: Location) => locations.find((l) => l.id === node.parentId)?.name;

  return (
    <section>
      <h2 className="text-[15px] font-semibold">Locations</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Rooms, furniture and shelves, nested as deep as you like. Click a name to rename it.
      </p>
      <div className="mt-4 rounded-xl border p-2">
        {tree.length === 0 && addingTo !== '' && (
          <div className="text-muted-foreground px-3 py-6 text-center text-sm">
            No locations yet. Start with a room, like Living room, then add shelves inside it.
          </div>
        )}
        {tree.map((node) => (
          <div key={node.id}>
            <LocationRow
              node={node}
              count={countIn(node.id)}
              editing={editing === node.id}
              setEditing={setEditing}
              onRename={(name) => mutations.update.mutate({ id: node.id, name })}
              onAddChild={() => setAddingTo(node.id)}
              onDelete={() => askDelete(node)}
            />
            {addingTo === node.id && (
              <NewLocation
                depth={node.depth + 1}
                placeholder={`Inside ${node.name}`}
                onSave={(name) => mutations.create.mutate({ name, parentId: node.id })}
                onCancel={() => setAddingTo(null)}
              />
            )}
          </div>
        ))}
        {addingTo === '' ? (
          <NewLocation
            depth={0}
            placeholder="Room or area"
            onSave={(name) => mutations.create.mutate({ name, parentId: null })}
            onCancel={() => setAddingTo(null)}
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground mt-1"
            onClick={() => setAddingTo('')}
          >
            <Plus />
            Add room or area
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={pendingDelete ? `Delete “${pendingDelete.node.name}”?` : ''}
        confirmLabel="Delete location"
        onConfirm={() => pendingDelete && remove(pendingDelete.node)}
        description={
          pendingDelete && (
            <>
              {pendingDelete.children > 0 &&
                `Its ${plural(pendingDelete.children, 'sub-location')} will be deleted too. `}
              {pendingDelete.items > 0 &&
                `${plural(pendingDelete.items, 'item')} stored here will move to ${
                  parentName(pendingDelete.node) ? `“${parentName(pendingDelete.node)}”` : 'no location'
                }.`}
            </>
          )
        }
      />
    </section>
  );
}

function DataSection() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { data: items = [] } = useItems();

  const importFile = async (file: File) => {
    setBusy(true);
    try {
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error('That file isn’t a Stacks backup. Choose a JSON file exported from Stacks.');
      }
      const result = await api.importLibrary(data);
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.items }),
        qc.invalidateQueries({ queryKey: keys.locations }),
      ]);
      toast.success(`Imported ${plural(result.items, 'item')}`, {
        description: result.skipped
          ? `${result.skipped} already in your library were left as they are.`
          : undefined,
      });
    } catch (e) {
      toast.error('Couldn’t import that file', { description: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="text-[15px] font-semibold">Your data</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Everything is stored on your server. A backup file includes covers, so it can restore a library on its
        own.
      </p>
      <div className="mt-4 divide-y rounded-xl border">
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <div className="text-sm font-medium">Export library</div>
            <div className="text-muted-foreground text-sm">
              Download items, locations and covers as one JSON file.
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={!items.length} asChild={!!items.length}>
            {items.length ? (
              <a href="/api/export" download>
                <Download />
                Export
              </a>
            ) : (
              <span>
                <Download />
                Export
              </span>
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <div className="text-sm font-medium">Import library</div>
            <div className="text-muted-foreground text-sm">
              Add items from a Stacks backup. Items you already have are kept as they are.
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload />
            {busy ? 'Importing…' : 'Import'}
          </Button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
          e.target.value = '';
        }}
      />
    </section>
  );
}

function AppearanceSection() {
  const { preference, setTheme } = useTheme();
  return (
    <section>
      <h2 className="text-[15px] font-semibold">Appearance</h2>
      <Segmented<ThemePreference>
        className="mt-3"
        value={preference}
        onChange={setTheme}
        options={[
          { value: 'system', label: 'System', icon: Monitor },
          { value: 'light', label: 'Light', icon: Sun },
          { value: 'dark', label: 'Dark', icon: Moon },
        ]}
      />
    </section>
  );
}

export function Settings() {
  return (
    <div className="anim-fade max-w-2xl">
      <PageHeader title="Settings" />
      <div className="space-y-10">
        <LocationsEditor />
        <AppearanceSection />
        <DataSection />
      </div>
    </div>
  );
}
