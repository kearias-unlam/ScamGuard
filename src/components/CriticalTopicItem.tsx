"use client";

import { useState } from 'react';

import type { CriticalTopic } from '@/types';

interface CriticalTopicItemProps {
  topic: CriticalTopic;
}

export function CriticalTopicItem({ topic }: CriticalTopicItemProps) {
  const [showAll, setShowAll] = useState(false);
  // Messages arrive newest first and are never empty (API contract).
  const [latestMessage] = topic.messages;

  function handleShowAll(): void {
    setShowAll(true);
  }

  return (
    <>
      <h2>{topic.title}</h2>
      <p className="muted">{`Mensajes similares: ${topic.messages.length}`}</p>
      <details>
        <summary data-testid="panel-topic-detail">Ver detalle</summary>
        <blockquote className="evidence">{latestMessage.text}</blockquote>
      </details>
      {/* The button disappears once every message is shown. */}
      {showAll ? (
        <ul>
          {topic.messages.map((message) => (
            <li key={message.id} data-testid="panel-topic-message">
              <blockquote className="evidence">{message.text}</blockquote>
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
