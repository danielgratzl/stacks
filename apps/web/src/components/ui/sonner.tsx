import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useTheme } from '@/lib/theme';

export function Toaster(props: ToasterProps) {
  const { resolved } = useTheme();
  return (
    <Sonner
      theme={resolved}
      position="bottom-left"
      mobileOffset={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { actionButton: '!bg-primary !text-primary-foreground !font-medium' } }}
      {...props}
    />
  );
}
