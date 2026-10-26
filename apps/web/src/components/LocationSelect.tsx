import { locationTree, type Location } from '@stacks/shared';
import { NativeSelect } from '@/components/ui/native-select';

export function LocationSelect({
  id,
  value,
  onChange,
  locations,
  placeholder = 'No location',
  className,
  'aria-label': ariaLabel,
}: {
  id?: string;
  value: string | null;
  onChange: (id: string | null) => void;
  locations: Location[];
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <NativeSelect
      id={id}
      aria-label={ariaLabel}
      className={className}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{placeholder}</option>
      {locationTree(locations).map((l) => (
        <option key={l.id} value={l.id}>
          {'\u2003'.repeat(l.depth)}
          {l.name}
        </option>
      ))}
    </NativeSelect>
  );
}
