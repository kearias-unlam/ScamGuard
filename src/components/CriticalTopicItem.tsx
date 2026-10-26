"use client";

import { useState } from 'react';

import type { CriticalTopic } from '@/types';

interface CriticalTopicItemProps {
  topic: CriticalTopic;
}

// US-3.4: display mapping only (singular for one share).
function formatTimesShared(timesShared: number): string {
  return timesShared === 1 ? 'Compartido 1 vez' : `Compartido ${timesShared} veces`;
}

export function CriticalTopicItem({ topic }: CriticalTopicItemProps) {
  const [showAll, setShowAll] = useState(false);
  // Messages arrive most recently shared first and are never empty (API contract).
  const [latestMessage] = topic.messages;

  function handleShowAll(): void {
    setShowAll(true);
  }

  return (
    <>
      <h2>{topic.title}</h2>
      <p className="muted">{`Mensajes similares: ${topic.timesShared}`}</p>
      {/* US-3.4: once every message is shown, the detail is hidden so no message appears twice. */}
      {showAll ? null : (
        <details>
          <summary data-testid="panel-topic-detail">Ver detalle</summary>
          <blockquote className="evidence">{latestMessage.text}</blockquote>
        </details>
      )}
      {/* The button disappears once every message is shown. */}
      {showAll ? (
        <ul className="topic-message-list">
          {topic.messages.map((message) => (
            <li key={message.id} data-testid="panel-topic-message">
              <blockquote className="evidence">{message.text}</blockquote>
              <p className="muted share-count" data-testid="panel-topic-message-count">
                {formatTimesShared(message.timesShared)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <button
          type="button"
          className="button button--secondary"
          onClick={handleShowAll}
          data-testid="panel-topic-show-all"
        >
          Ver todos los mensajes
        </button>
      )}
    </>
  );
}
