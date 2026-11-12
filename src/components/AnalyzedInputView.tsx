interface AnalyzedInputViewProps {
  analyzedInput: string;
}

// US-10.3: what was analyzed in an entry opened from the history (the message or link as sent, or the email digest).
// Read only: the form does not change.
export function AnalyzedInputView({ analyzedInput }: AnalyzedInputViewProps) {
  return (
    <section className="analyzed-input" aria-labelledby="analyzed-input-heading">
      <h2 id="analyzed-input-heading">Lo que analizaste</h2>
      {/* Scrolls when long (an email digest), so it is focusable for keyboard users. */}
      <blockquote className="evidence analyzed-input__text" tabIndex={0} data-testid="history-entry-input">
        {analyzedInput}
      </blockquote>
    </section>
  );
}
