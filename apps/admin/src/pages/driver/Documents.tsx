import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { ApiError, queryKeys, useDriverProfile, useServices } from '@bd-cabs/core';
import { VehicleDocumentsPanel } from '@/components/VehicleDocumentsPanel';

const DOC_TYPES = ['license', 'nid', 'insurance', 'fitness', 'registration', 'other'];

/** Driver onboarding (license + driver type) and document upload / renewal. */
export default function DocumentsPage() {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const profile = useDriverProfile();

  const docs = useQuery({
    queryKey: queryKeys.drivers.documents(),
    queryFn: () => endpoints.drivers.documents(),
  });

  // Vehicles the driver owns or actively rents — they can upload each car's papers.
  const vehicles = useQuery({
    queryKey: queryKeys.vehicles.mine(),
    queryFn: () => endpoints.vehicles.mine(),
  });

  const [license, setLicense] = useState('');
  const [isRental, setIsRental] = useState(false);
  const [docType, setDocType] = useState('license');
  const [docUrl, setDocUrl] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const onboard = useMutation({
    mutationFn: () => endpoints.drivers.onboard({ licenseNumber: license.trim(), isRentalDriver: isRental }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.drivers.me() }),
  });

  const addDoc = useMutation({
    mutationFn: () => endpoints.drivers.addDocument({
      type: docType,
      documentUrl: docUrl.trim(),
      number: docNumber.trim() || undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    }),
    onSuccess: () => { setDocUrl(''); setDocNumber(''); setExpiresAt(''); void qc.invalidateQueries({ queryKey: queryKeys.drivers.documents() }); },
  });

  const onboarded = profile.data && !(profile.isError);

  return (
    <Row className="g-4">
      <Col xs={12} lg={5}>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <h1 className="h5 mb-3">Driver profile</h1>
            {profile.data && (
              <div className="mb-3">
                <Badge bg={profile.data.verificationStatus === 'approved' ? 'success' : 'warning'} text={profile.data.verificationStatus === 'approved' ? undefined : 'dark'}>
                  {profile.data.verificationStatus}
                </Badge>{' '}
                <span className="text-muted small">{profile.data.isRentalDriver ? 'Rental driver' : 'Owner-driver'}</span>
              </div>
            )}
            {onboard.isSuccess && <Alert variant="success" className="py-2">Onboarding submitted for review.</Alert>}
            <Form.Group className="mb-2">
              <Form.Label>Driving licence number</Form.Label>
              <Form.Control value={license} onChange={(e) => setLicense(e.target.value)} placeholder={profile.data?.licenseNumber ?? 'DHK-123456'} />
            </Form.Group>
            <Form.Check className="mb-3" type="checkbox" id="rental" label="I rent my vehicle from an owner" checked={isRental} onChange={(e) => setIsRental(e.target.checked)} />
            <Button variant="success" disabled={!license.trim() || onboard.isPending} onClick={() => onboard.mutate()}>
              {onboard.isPending ? 'Submitting…' : onboarded ? 'Update onboarding' : 'Submit onboarding'}
            </Button>
          </Card.Body>
        </Card>
      </Col>

      <Col xs={12} lg={7}>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted mb-3">My documents</h2>
            {docs.isLoading && <Spinner animation="border" size="sm" variant="success" />}
            {docs.data && docs.data.length === 0 && <p className="text-muted">No documents uploaded yet.</p>}
            {docs.data?.map((d) => (
              <div key={d.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                  <div className="fw-medium text-capitalize">{d.type}{d.number ? ` · ${d.number}` : ''}</div>
                  <div className="text-muted small">{d.expiresAt ? `Expires ${new Date(d.expiresAt).toLocaleDateString()}` : 'No expiry'}</div>
                </div>
                <Badge bg={d.verificationStatus === 'approved' ? 'success' : d.verificationStatus === 'rejected' ? 'danger' : 'warning'} text={d.verificationStatus === 'pending' ? 'dark' : undefined}>
                  {d.verificationStatus}
                </Badge>
              </div>
            ))}
          </Card.Body>
        </Card>

        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted mb-3">Upload / renew a document</h2>
            {addDoc.isError && (
              <Alert variant="danger" className="py-2">
                {addDoc.error instanceof ApiError ? addDoc.error.message : 'Upload failed.'}
              </Alert>
            )}
            <Row className="g-2">
              <Col xs={12} sm={6}>
                <Form.Select value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPES.map((t) => <option key={t} value={t} className="text-capitalize">{t}</option>)}
                </Form.Select>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Control placeholder="Document number" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
              </Col>
              <Col xs={12} sm={8}>
                <Form.Control placeholder="Document URL (scan/photo link)" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} />
              </Col>
              <Col xs={12} sm={4}>
                <Form.Control type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </Col>
              <Col xs={12} className="d-grid">
                <Button variant="outline-success" disabled={!docUrl.trim() || addDoc.isPending} onClick={() => addDoc.mutate()}>
                  {addDoc.isPending ? 'Uploading…' : 'Upload document'}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>

      <Col xs={12}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted mb-3">Vehicle documents</h2>
            <p className="text-muted small">
              Upload the papers, insurance and fitness certificates for a vehicle you own or rent. Each file (image or PDF) is re-verified by the platform.
            </p>
            {vehicles.isLoading && <Spinner animation="border" size="sm" variant="success" />}
            {vehicles.data && vehicles.data.length === 0 && (
              <p className="text-muted mb-0">No vehicles are linked to your account yet. Once you own or rent a vehicle it will appear here.</p>
            )}
            {vehicles.data?.map((v) => (
              <div key={v.id} className="border rounded p-3 mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="fw-medium">{v.make ?? v.type} {v.model ?? ''} · {v.plateNumber}</div>
                  <Badge bg={v.verificationStatus === 'approved' ? 'success' : v.verificationStatus === 'rejected' ? 'danger' : 'warning'} text={v.verificationStatus === 'approved' ? undefined : 'dark'}>
                    {v.verificationStatus}
                  </Badge>
                </div>
                <VehicleDocumentsPanel vehicleId={v.id} />
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
