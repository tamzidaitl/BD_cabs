import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { ApiError, queryKeys, useServices, type Vehicle } from '@bd-cabs/core';
import { formatBDT, takaToMinor, VEHICLE_TYPES } from '@/lib/appNav';
import { VehicleDocumentsPanel } from '@/components/VehicleDocumentsPanel';

const VEHICLE_STATUSES = ['active', 'inactive', 'maintenance'] as const;

/**
 * Vehicle management for a fleet owner: register a vehicle (enters Ops
 * verification), set its operational status (active / inactive / maintenance),
 * upload a photo, and manage papers/insurance/fitness documents with expiry
 * tracking. (Capabilities: register vehicles, activate/deactivate, upload
 * picture & documents, manage documents/expiry.)
 */
export default function FleetVehiclesPage() {
  const qc = useQueryClient();
  const { endpoints } = useServices();

  const vehicles = useQuery({
    queryKey: queryKeys.vehicles.mine(),
    queryFn: () => endpoints.vehicles.mine(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.vehicles.mine() });

  return (
    <Row className="g-4">
      <Col xs={12} lg={5}>
        <RegisterCard onCreated={invalidate} />
      </Col>
      <Col xs={12} lg={7}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted mb-3">My vehicles</h2>
            {vehicles.isLoading && <Spinner animation="border" size="sm" variant="success" />}
            {vehicles.data && vehicles.data.length === 0 && <p className="text-muted mb-0">No vehicles registered yet.</p>}
            {vehicles.data?.map((v) => <VehicleCard key={v.id} vehicle={v} onChanged={invalidate} />)}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

const MAX_PHOTOS = 5;

function RegisterCard({ onCreated }: { onCreated: () => void }) {
  const { endpoints } = useServices();
  const [type, setType] = useState<string>('Car');
  const [plateNumber, setPlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [forRent, setForRent] = useState(false);
  const [rentTaka, setRentTaka] = useState('');
  const [rentalTerms, setRentalTerms] = useState('');

  function addFiles(list: FileList | null) {
    if (!list) return;
    setPhotoError(null);
    const incoming = Array.from(list);
    const tooBig = incoming.find((f) => f.size > 5 * 1024 * 1024);
    if (tooBig) { setPhotoError(`"${tooBig.name}" is larger than 5 MB.`); return; }
    setPhotos((prev) => {
      const merged = [...prev, ...incoming].slice(0, MAX_PHOTOS);
      if (prev.length + incoming.length > MAX_PHOTOS) setPhotoError(`Up to ${MAX_PHOTOS} photos — extra files were ignored.`);
      return merged;
    });
  }
  const removePhoto = (i: number) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const create = useMutation({
    mutationFn: async () => {
      // Upload each chosen image first, then register the vehicle with the URLs.
      const uploaded = await Promise.all(photos.map((f) => endpoints.vehicles.uploadPhoto(f)));
      return endpoints.vehicles.create({
        type,
        plateNumber: plateNumber.trim(),
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        color: color.trim() || undefined,
        year: year ? Number(year) : undefined,
        description: description.trim() || undefined,
        photoUrls: uploaded.map((u) => u.url),
        forRent,
        rentalPriceMinor: forRent && rentTaka ? takaToMinor(Number(rentTaka)) : undefined,
        rentalTerms: forRent ? rentalTerms.trim() || undefined : undefined,
      });
    },
    onSuccess: () => {
      setPlate(''); setMake(''); setModel(''); setColor(''); setYear(''); setDescription(''); setPhotos([]); setPhotoError(null);
      setForRent(false); setRentTaka(''); setRentalTerms('');
      onCreated();
    },
  });

  const canSubmit = !!plateNumber.trim() && photos.length >= 1 && photos.length <= MAX_PHOTOS;

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h1 className="h5 mb-3">Register a vehicle</h1>
        {create.isSuccess && <Alert variant="success" className="py-2">Vehicle registered — pending verification.</Alert>}
        {create.isError && (
          <Alert variant="danger" className="py-2">{create.error instanceof ApiError ? create.error.message : 'Could not register vehicle.'}</Alert>
        )}
        <Row className="g-2">
          <Col xs={6}>
            <Form.Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Vehicle type">
              {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Form.Select>
          </Col>
          <Col xs={6}>
            <Form.Control placeholder="Plate number" value={plateNumber} onChange={(e) => setPlate(e.target.value)} />
          </Col>
          <Col xs={6}><Form.Control placeholder="Make" value={make} onChange={(e) => setMake(e.target.value)} /></Col>
          <Col xs={6}><Form.Control placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} /></Col>
          <Col xs={6}><Form.Control placeholder="Color" value={color} onChange={(e) => setColor(e.target.value)} /></Col>
          <Col xs={6}><Form.Control type="number" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} /></Col>
          <Col xs={12}>
            <Form.Control as="textarea" rows={2} placeholder="Description (condition, features, notes for the reviewer)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </Col>

          <Col xs={12}>
            <Form.Label className="small text-muted mb-1">Photos — upload 1 to {MAX_PHOTOS} ({photos.length}/{MAX_PHOTOS})</Form.Label>
            <Form.Control
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              disabled={photos.length >= MAX_PHOTOS}
              onChange={(e) => { addFiles((e.target as HTMLInputElement).files); (e.target as HTMLInputElement).value = ''; }}
            />
            {photoError && <div className="text-warning small mt-1">{photoError}</div>}
            {photos.length > 0 && (
              <div className="d-flex flex-wrap gap-2 mt-2">
                {photos.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="position-relative">
                    <img src={URL.createObjectURL(f)} alt={f.name} className="rounded border" style={{ width: 72, height: 56, objectFit: 'cover' }} />
                    <Button
                      size="sm"
                      variant="danger"
                      className="position-absolute top-0 end-0 p-0 lh-1 rounded-circle"
                      style={{ width: 18, height: 18, transform: 'translate(35%,-35%)' }}
                      onClick={() => removePhoto(i)}
                      aria-label={`Remove ${f.name}`}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Col>

          <Col xs={12}>
            <Form.Check type="switch" id="forRent" label="Offer this vehicle for rent to drivers" checked={forRent} onChange={(e) => setForRent(e.target.checked)} />
          </Col>
          {forRent && (
            <>
              <Col xs={12}><Form.Control type="number" placeholder="Rent / period (৳)" value={rentTaka} onChange={(e) => setRentTaka(e.target.value)} /></Col>
              <Col xs={12}><Form.Control as="textarea" rows={2} placeholder="Rental terms" value={rentalTerms} onChange={(e) => setRentalTerms(e.target.value)} /></Col>
            </>
          )}
          <Col xs={12} className="d-grid">
            <Button variant="success" disabled={!canSubmit || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Uploading & registering…' : 'Register vehicle'}
            </Button>
            {photos.length === 0 && <div className="text-muted small mt-1">At least 1 photo is required.</div>}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

function VehicleCard({ vehicle, onChanged }: { vehicle: Vehicle; onChanged: () => void }) {
  const { endpoints } = useServices();
  const [showDocs, setShowDocs] = useState(false);

  const setStatus = useMutation({
    mutationFn: (status: string) => endpoints.vehicles.setStatus(vehicle.id, status),
    onSuccess: onChanged,
  });
  const remove = useMutation({
    mutationFn: () => endpoints.vehicles.remove(vehicle.id),
    onSuccess: onChanged,
  });

  const verified = vehicle.verificationStatus === 'approved';

  return (
    <div className="border rounded p-3 mb-3">
      {vehicle.photoUrls.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-2">
          {vehicle.photoUrls.map((url) => (
            <img key={url} src={url} alt={vehicle.plateNumber} className="rounded border" style={{ width: 80, height: 60, objectFit: 'cover' }} />
          ))}
        </div>
      )}
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="fw-medium">{vehicle.make ?? vehicle.type} {vehicle.model ?? ''} · {vehicle.plateNumber}</div>
          <div className="text-muted small">
            {vehicle.type}{vehicle.color ? ` · ${vehicle.color}` : ''}{vehicle.year ? ` · ${vehicle.year}` : ''}
            {vehicle.forRent && vehicle.rentalPriceMinor ? ` · ${formatBDT(vehicle.rentalPriceMinor)}/period` : ''}
          </div>
        </div>
        <div className="text-end">
          <Badge bg={verified ? 'success' : vehicle.verificationStatus === 'rejected' ? 'danger' : 'warning'} text={verified ? undefined : 'dark'}>
            {vehicle.verificationStatus}
          </Badge>
        </div>
      </div>

      {setStatus.isError && (
        <Alert variant="danger" className="py-1 px-2 my-2 small">
          {setStatus.error instanceof ApiError ? setStatus.error.message : 'Could not change status.'}
        </Alert>
      )}

      <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
        <span className="text-muted small">Status:</span>
        <Form.Select
          size="sm"
          style={{ width: 'auto' }}
          value={vehicle.status}
          disabled={setStatus.isPending}
          onChange={(e) => setStatus.mutate(e.target.value)}
          aria-label="Vehicle status"
        >
          {VEHICLE_STATUSES.map((s) => (
            <option key={s} value={s} disabled={s === 'active' && !verified}>{s}</option>
          ))}
        </Form.Select>
        {!verified && <span className="text-muted small">Activate after verification</span>}
        <div className="ms-auto d-flex gap-2">
          <Button size="sm" variant="outline-secondary" onClick={() => setShowDocs((s) => !s)}>
            {showDocs ? 'Hide documents' : 'Documents'}
          </Button>
          <Button size="sm" variant="outline-danger" disabled={remove.isPending} onClick={() => remove.mutate()}>
            Remove
          </Button>
        </div>
      </div>
      {remove.isError && (
        <Alert variant="danger" className="py-1 px-2 mt-2 mb-0 small">
          {remove.error instanceof ApiError ? remove.error.message : 'Could not remove vehicle.'}
        </Alert>
      )}

      {showDocs && <VehicleDocumentsPanel vehicleId={vehicle.id} />}
    </div>
  );
}
