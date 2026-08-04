import { Link, useParams } from 'react-router-dom';
import Summary from './Summary.jsx';

export default function HistoryDetail() {
  const { sessionId } = useParams();

  return (
    <section className="page-stack">
      <Link className="button ghost fit" to="/history">Back to history</Link>
      <Summary key={sessionId} />
    </section>
  );
}
