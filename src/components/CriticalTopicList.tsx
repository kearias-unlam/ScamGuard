import { CriticalTopicItem } from '@/components/CriticalTopicItem';
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
    <ul className="topic-list">
      {topics.map((topic) => (
        <li key={topic.topic} className="card critical-topic" data-testid="panel-topic">
          <CriticalTopicItem topic={topic} />
        </li>
      ))}
    </ul>
  );
}
