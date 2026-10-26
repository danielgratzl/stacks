import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Nothing on this shelf"
      actions={
        <Button asChild>
          <Link to="/">Go to overview</Link>
        </Button>
      }
    >
      This page doesn’t exist. It may have moved, or the link is mistyped.
    </EmptyState>
  );
}
