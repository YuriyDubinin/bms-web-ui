import { Construction } from 'lucide-react';
import { Card } from '@shared/ui';
import { useDocumentTitle } from '@shared/lib';
import { PageHeader } from '@widgets/page-header';

export function WorkflowPage() {
  useDocumentTitle('Workflow');
  return (
    <>
      <PageHeader title="Workflow" subtitle={'// empty'} />
      <Card>
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <Construction size={20} aria-hidden className="text-fg-muted" />
          <p className="font-mono text-xs text-fg-muted">Nothing here yet.</p>
        </div>
      </Card>
    </>
  );
}
