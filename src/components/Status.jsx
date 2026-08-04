export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="state-panel">
      <div className="loader" />
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="state-panel error-panel" role="alert">
      <strong>Could not load this view</strong>
      <p>{message}</p>
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="state-panel empty-panel">
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  );
}
