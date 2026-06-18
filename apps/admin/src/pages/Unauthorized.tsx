import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center text-center p-4"
      style={{ minHeight: '100vh' }}
    >
      <ShieldX size={56} className="text-danger mb-3" />
      <h1 className="h3">Access denied</h1>
      <p className="text-muted" style={{ maxWidth: 440 }}>
        Your role doesn&apos;t have permission to view this page. If you believe this is a mistake,
        contact a Super Admin.
      </p>
      <Link to="/dashboard" className="btn btn-success">
        Back to dashboard
      </Link>
    </div>
  );
}
