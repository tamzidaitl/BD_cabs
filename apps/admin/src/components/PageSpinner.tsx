import { Spinner } from 'react-bootstrap';

/** Centered loading spinner used as the Suspense fallback while a lazy route chunk loads. */
export function PageSpinner({ minHeight = '60vh' }: { minHeight?: string }) {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight }}>
      <Spinner animation="border" variant="success" role="status" aria-label="Loading" />
    </div>
  );
}
