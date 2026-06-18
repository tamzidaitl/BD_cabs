import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Col, Form, Row, Spinner } from 'react-bootstrap';
import { ApiError, queryKeys, useServices } from '@bd-cabs/core';

const DOC_TYPES = ['registration', 'insurance', 'fitness', 'other'] as const;

/**
 * Vehicle documents list + a file-based uploader, shared by the fleet owner's
 * Vehicles page and the driver's Documents page. The reviewer (Ops) re-verifies
 * each upload; expiry is highlighted so papers/insurance/fitness can be renewed
 * before they lapse. The owner or a driver who owns/rents the vehicle may upload.
 */
export function VehicleDocumentsPanel({ vehicleId }: { vehicleId: string }) {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const fileRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<string>('registration');
  const [file, setFile] = useState<File | null>(null);
  const [number, setNumber] = useState('');
  const [expiresAt, setExpires] = useState('');

  const docs = useQuery({
    queryKey: queryKeys.vehicles.documents(vehicleId),
    queryFn: () => endpoints.vehicles.documents(vehicleId),
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected.');
      // Upload the file first, then attach its URL as the document.
      const { url } = await endpoints.vehicles.uploadDocumentFile(file);
      return endpoints.vehicles.addDocument(vehicleId, {
        type,
        documentUrl: url,
        number: number.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
    },
    onSuccess: () => {
      setFile(null); setNumber(''); setExpires('');
      if (fileRef.current) fileRef.current.value = '';
      void qc.invalidateQueries({ queryKey: queryKeys.vehicles.documents(vehicleId) });
    },
  });

  const now = Date.now();
  const soon = now + 30 * 24 * 60 * 60 * 1000; // 30 days

  return (
    <div className="bg-light rounded p-3 mt-3">
      {docs.isLoading && <Spinner animation="border" size="sm" variant="success" />}
      {docs.data && docs.data.length === 0 && <p className="text-muted small mb-2">No documents uploaded.</p>}
      {docs.data?.map((d) => {
        const exp = d.expiresAt ? new Date(d.expiresAt).getTime() : null;
        const expired = exp !== null && exp < now;
        const expiring = exp !== null && exp >= now && exp <= soon;
        return (
          <div key={d.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
            <div>
              <a href={d.documentUrl} target="_blank" rel="noreferrer" className="fw-medium text-capitalize text-decoration-none">
                {d.type}{d.number ? ` · ${d.number}` : ''}
              </a>
              <div className={`small ${expired ? 'text-danger' : expiring ? 'text-warning' : 'text-muted'}`}>
                {d.expiresAt ? `${expired ? 'Expired' : 'Expires'} ${new Date(d.expiresAt).toLocaleDateString()}` : 'No expiry'}
                {expiring && ' · renew soon'}
              </div>
            </div>
            <Badge bg={d.verificationStatus === 'approved' ? 'success' : d.verificationStatus === 'rejected' ? 'danger' : 'warning'} text={d.verificationStatus === 'pending' ? 'dark' : undefined}>
              {d.verificationStatus}
            </Badge>
          </div>
        );
      })}

      {add.isError && (
        <Alert variant="danger" className="py-1 px-2 my-2 small">
          {add.error instanceof ApiError ? add.error.message : 'Upload failed.'}
        </Alert>
      )}

      <Row className="g-2 mt-2">
        <Col xs={6}>
          <Form.Select size="sm" value={type} onChange={(e) => setType(e.target.value)} aria-label="Document type">
            {DOC_TYPES.map((t) => <option key={t} value={t} className="text-capitalize">{t}</option>)}
          </Form.Select>
        </Col>
        <Col xs={6}><Form.Control size="sm" placeholder="Number" value={number} onChange={(e) => setNumber(e.target.value)} /></Col>
        <Col xs={8}>
          <Form.Control
            ref={fileRef as never}
            size="sm"
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={(e) => setFile((e.target as HTMLInputElement).files?.[0] ?? null)}
          />
        </Col>
        <Col xs={4}><Form.Control size="sm" type="date" value={expiresAt} onChange={(e) => setExpires(e.target.value)} aria-label="Expiry date" /></Col>
        <Col xs={12} className="d-grid">
          <Button size="sm" variant="outline-success" disabled={!file || add.isPending} onClick={() => add.mutate()}>
            {add.isPending ? 'Uploading…' : 'Upload document'}
          </Button>
          <div className="text-muted small mt-1">Image or PDF, up to 10 MB.</div>
        </Col>
      </Row>
    </div>
  );
}
