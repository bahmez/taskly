import WorkspaceBoardsClient from './workspace-boards-client';

export default function WorkspaceBoardsPage({ params }: { params: { workspaceId: string } }) {
  return <WorkspaceBoardsClient workspaceId={params.workspaceId} />;
}


