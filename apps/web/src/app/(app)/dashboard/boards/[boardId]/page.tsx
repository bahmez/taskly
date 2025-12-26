import BoardClient from './board-client';

export default function BoardPage({ params }: { params: { boardId: string } }) {
  const { boardId } = params;
  return <BoardClient boardId={boardId} />;
}


