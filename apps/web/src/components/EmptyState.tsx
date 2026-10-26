import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  children,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="anim-fade mx-auto mt-16 max-w-sm text-center">
      <div className="bg-muted text-muted-foreground mx-auto mb-5 grid size-12 place-items-center rounded-full">
        <Icon className="size-5" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1.5 text-sm">{children}</p>
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
