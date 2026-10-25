import type { CriticalTopic } from '@/types';

interface CriticalTopicListProps {
  topics: CriticalTopic[];
}

export function CriticalTopicList({ topics }: CriticalTopicListProps) {
  if (topics.length === 0) {
    return (
      <p className="muted" data-testid="panel-empty">
        Todavía no hay mensajes críticos registrados.
      </p>
    );
  }

  // Topics keep the backend order (most messages first).
  return (
    <ul>
      {topics.map((topic) => (
        <li key={topic.topic} className="card" data-testid="panel-topic">
          <h2>{topic.title}</h2>
          <p className="muted">{`Mensajes similares: ${topic.messages.length}`}</p>
        </li>
      ))}
    </ul>
  );
}
