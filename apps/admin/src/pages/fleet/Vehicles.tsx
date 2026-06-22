import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, FloatingLabel, Form, Row, Spinner } from 'react-bootstrap';
import { ApiError, queryKeys, useServices, type Vehicle } from '@bd-cabs/core';
import { formatBDT, RENTAL_PERIODS, RENTAL_STANDARD_TERMS, rentalPeriodSuffix, takaToMinor, VEHICLE_TYPES } from '@/lib/appNav';

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
const DOC_TYPES = ['registration', 'insurance', 'fitness', 'other'] as const;

/** A document staged during registration, attached once the vehicle is created. */
type StagedDoc = { file: File; type: string; number: string; expiresAt: string };

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
  const [rentPeriod, setRentPeriod] = useState<string>('monthly');
  const [rentalTerms, setRentalTerms] = useState('');

  // Documents are staged locally and uploaded after the vehicle exists.
  const [docs, setDocs] = useState<StagedDoc[]>([]);
  const [docType, setDocType] = useState<string>('registration');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docNumber, setDocNumber] = useState('');
  const [docExpires, setDocExpires] = useState('');
  const [docError, setDocError] = useState<string | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

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

  function stageDoc() {
    setDocError(null);
    if (!docFile) return;
    if (docFile.size > 10 * 1024 * 1024) { setDocError(`"${docFile.name}" is larger than 10 MB.`); return; }
    setDocs((prev) => [...prev, { file: docFile, type: docType, number: docNumber.trim(), expiresAt: docExpires }]);
    setDocType('registration'); setDocFile(null); setDocNumber(''); setDocExpires('');
    if (docFileRef.current) docFileRef.current.value = '';
  }
  const removeDoc = (i: number) => setDocs((prev) => prev.filter((_, idx) => idx !== i));

  const create = useMutation({
    mutationFn: async () => {
      // Upload each chosen image first, then register the vehicle with the URLs.
      const uploaded = await Promise.all(photos.map((f) => endpoints.vehicles.uploadPhoto(f)));
      const vehicle = await endpoints.vehicles.create({
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
        rentalPeriod: forRent ? rentPeriod : undefined,
        rentalTerms: forRent ? rentalTerms.trim() || undefined : undefined,
      });
      // Attach any staged documents to the freshly created vehicle.
      for (const d of docs) {
        const { url } = await endpoints.vehicles.uploadDocumentFile(d.file);
        await endpoints.vehicles.addDocument(vehicle.id, {
          type: d.type,
          documentUrl: url,
          number: d.number || undefined,
          expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : undefined,
        });
      }
      return vehicle;
    },
    onSuccess: () => {
      setPlate(''); setMake(''); setModel(''); setColor(''); setYear(''); setDescription(''); setPhotos([]); setPhotoError(null);
      setForRent(false); setRentTaka(''); setRentPeriod('monthly'); setRentalTerms('');
      setDocs([]); setDocType('registration'); setDocFile(null); setDocNumber(''); setDocExpires(''); setDocError(null);
      if (docFileRef.current) docFileRef.current.value = '';
      onCreated();
    },
  });

  const canSubmit = !!plateNumber.trim() && photos.length >= 1 && photos.length <= MAX_PHOTOS;

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="bg-success bg-gradient text-white p-4">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center bg-white bg-opacity-25 rounded-3 flex-shrink-0"
            style={{ width: 48, height: 48, fontSize: '1.5rem' }}
            aria-hidden="true"
          >
            🚗
          </div>
          <div>
            <h1 className="h5 mb-1">Register a vehicle</h1>
            <p className="mb-0 small text-white-50">List it once, get verified, and start earning with BD Cabs.</p>
          </div>
        </div>
      </div>
      <Card.Body className="p-4">
        {create.isSuccess && <Alert variant="success" className="py-2">Vehicle registered — pending verification.</Alert>}
        {create.isError && (
          <Alert variant="danger" className="py-2">{create.error instanceof ApiError ? create.error.message : 'Could not register vehicle.'}</Alert>
        )}

        <div className="d-flex align-items-center gap-2 text-success-emphasis text-uppercase fw-semibold small mb-3">
          <span className="badge rounded-pill bg-success-subtle text-success-emphasis">1</span>
          Vehicle details
        </div>
        <Row className="g-3">
          <Col xs={6}>
            <FloatingLabel label="Vehicle type">
              <Form.Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Vehicle type">
                {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Form.Select>
            </FloatingLabel>
          </Col>
          <Col xs={6}>
            <FloatingLabel label="Plate number *">
              <Form.Control placeholder="Plate number" value={plateNumber} onChange={(e) => setPlate(e.target.value)} />
            </FloatingLabel>
          </Col>
          <Col xs={6}><FloatingLabel label="Brand"><Form.Control placeholder="Brand" value={make} onChange={(e) => setMake(e.target.value)} /></FloatingLabel></Col>
          <Col xs={6}><FloatingLabel label="Model"><Form.Control placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} /></FloatingLabel></Col>
          <Col xs={6}><FloatingLabel label="Color"><Form.Control placeholder="Color" value={color} onChange={(e) => setColor(e.target.value)} /></FloatingLabel></Col>
          <Col xs={6}><FloatingLabel label="Year"><Form.Control type="number" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} /></FloatingLabel></Col>
          <Col xs={12}>
            <FloatingLabel label="Description">
              <Form.Control as="textarea" placeholder="Description (condition, features, notes for the reviewer)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} style={{ height: 80 }} />
            </FloatingLabel>
          </Col>
        </Row>

        <hr className="my-4" />

        <div className="d-flex align-items-center gap-2 text-success-emphasis text-uppercase fw-semibold small mb-2">
          <span className="badge rounded-pill bg-success-subtle text-success-emphasis">2</span>
          Photos
          <Badge bg={photos.length ? 'success' : 'secondary'} className="ms-auto fw-normal">{photos.length}/{MAX_PHOTOS}</Badge>
        </div>
        <p className="text-muted small mb-2">Upload 1 to {MAX_PHOTOS} clear photos — the first one is shown as the cover.</p>
        {/* Native input is visually hidden — its value is reset after each pick (so files can be
            re-added), which would otherwise leave the control showing "No file chosen". The
            thumbnails below are the source of truth; this label is the styled dropzone trigger. */}
        <Form.Control
          id="vehiclePhotoInput"
          type="file"
          className="d-none"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          disabled={photos.length >= MAX_PHOTOS}
          onChange={(e) => { addFiles((e.target as HTMLInputElement).files); (e.target as HTMLInputElement).value = ''; }}
        />
        <Form.Label
          htmlFor="vehiclePhotoInput"
          className={`d-flex flex-column align-items-center justify-content-center text-center border border-2 rounded-3 p-4 mb-0 w-100 ${photos.length >= MAX_PHOTOS ? 'bg-light text-muted' : 'border-success-subtle text-success-emphasis bg-success-subtle bg-opacity-25'}`}
          style={{ borderStyle: 'dashed', cursor: photos.length >= MAX_PHOTOS ? 'not-allowed' : 'pointer' }}
        >
          <span aria-hidden="true" style={{ fontSize: '1.75rem', lineHeight: 1 }}>📷</span>
          <span className="fw-semibold mt-2">
            {photos.length >= MAX_PHOTOS ? `Maximum of ${MAX_PHOTOS} photos added` : photos.length ? 'Add more photos' : 'Click to upload photos'}
          </span>
          <span className="small text-muted">PNG, JPG, WEBP or GIF · up to 5 MB each</span>
        </Form.Label>
        {photoError && <div className="text-warning small mt-1">{photoError}</div>}
        {photos.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mt-3">
            {photos.map((f, i) => (
              <div key={`${f.name}-${i}`} className="position-relative">
                <img src={URL.createObjectURL(f)} alt={f.name} className="rounded-3 border shadow-sm" style={{ width: 84, height: 64, objectFit: 'cover' }} />
                {i === 0 && <Badge bg="dark" className="position-absolute bottom-0 start-0 m-1 fw-normal" style={{ fontSize: '0.6rem' }}>Cover</Badge>}
                <Button
                  size="sm"
                  variant="danger"
                  className="position-absolute top-0 end-0 p-0 lh-1 rounded-circle shadow-sm"
                  style={{ width: 20, height: 20, transform: 'translate(35%,-35%)' }}
                  onClick={() => removePhoto(i)}
                  aria-label={`Remove ${f.name}`}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        <hr className="my-4" />

        <div className="d-flex align-items-center gap-2 text-success-emphasis text-uppercase fw-semibold small mb-2">
          <span className="badge rounded-pill bg-success-subtle text-success-emphasis">3</span>
          Documents
          <span className="text-muted text-lowercase fw-normal">(optional)</span>
          {docs.length > 0 && <Badge bg="success" className="ms-auto fw-normal">{docs.length} added</Badge>}
        </div>
        {docs.length > 0 && (
          <div className="mb-3">
            {docs.map((d, i) => (
              <div key={`${d.file.name}-${i}`} className="d-flex justify-content-between align-items-center border-bottom py-2 small">
                <span className="text-truncate">
                  <span className="fw-medium text-capitalize">{d.type}</span>
                  {d.number ? ` · ${d.number}` : ''}
                  <span className="text-muted"> · {d.file.name}</span>
                  {d.expiresAt ? <span className="text-muted"> · exp {d.expiresAt}</span> : ''}
                </span>
                <Button size="sm" variant="link" className="text-danger p-0 ms-2" onClick={() => removeDoc(i)} aria-label={`Remove ${d.file.name}`}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
        <Card className="border bg-light-subtle">
          <Card.Body className="p-3">
            <Row className="g-2">
              <Col xs={6}>
                <Form.Select size="sm" value={docType} onChange={(e) => setDocType(e.target.value)} aria-label="Document type">
                  {DOC_TYPES.map((t) => <option key={t} value={t} className="text-capitalize">{t}</option>)}
                </Form.Select>
              </Col>
              <Col xs={6}><Form.Control size="sm" placeholder="Number" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} /></Col>
              <Col xs={8}>
                <Form.Control
                  ref={docFileRef as never}
                  size="sm"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => setDocFile((e.target as HTMLInputElement).files?.[0] ?? null)}
                />
              </Col>
              <Col xs={4}><Form.Control size="sm" type="date" value={docExpires} onChange={(e) => setDocExpires(e.target.value)} aria-label="Expiry date" /></Col>
              <Col xs={12} className="d-grid">
                <Button size="sm" variant="outline-success" disabled={!docFile} onClick={stageDoc}>+ Add document</Button>
                {docError && <div className="text-warning small mt-1">{docError}</div>}
                <div className="text-muted small mt-1">Image or PDF, up to 10 MB. Each document is verified by Ops after registration.</div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <hr className="my-4" />

        <Card className={`border ${forRent ? 'border-success bg-success-subtle' : 'bg-light-subtle'}`}>
          <Card.Body className="p-3">
            <Form.Check
              type="switch"
              id="forRent"
              checked={forRent}
              onChange={(e) => setForRent(e.target.checked)}
              label={
                <span>
                  <span className="fw-semibold">💰 Offer this vehicle for rent to drivers</span>
                  <span className="d-block text-muted small">Earn passive income by renting your vehicle to verified drivers.</span>
                </span>
              }
            />
            {forRent && (
              <Row className="g-3 mt-1">
                <Col xs={12}>
                  <div className="alert alert-light border py-2 px-3 mb-0 small">{RENTAL_STANDARD_TERMS}</div>
                </Col>
                <Col xs={7}>
                  <FloatingLabel label="Rent amount (৳)">
                    <Form.Control type="number" placeholder="Rent amount" value={rentTaka} onChange={(e) => setRentTaka(e.target.value)} />
                  </FloatingLabel>
                </Col>
                <Col xs={5}>
                  <FloatingLabel label="Per">
                    <Form.Select value={rentPeriod} onChange={(e) => setRentPeriod(e.target.value)} aria-label="Rental period">
                      {RENTAL_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </Form.Select>
                  </FloatingLabel>
                </Col>
                <Col xs={12}>
                  <FloatingLabel label="Additional terms (optional)">
                    <Form.Control as="textarea" placeholder="Additional terms" value={rentalTerms} onChange={(e) => setRentalTerms(e.target.value)} style={{ height: 70 }} />
                  </FloatingLabel>
                </Col>
              </Row>
            )}
          </Card.Body>
        </Card>

        <div className="d-grid mt-4">
          <Button size="lg" variant="success" disabled={!canSubmit || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Uploading & registering…' : 'Register vehicle'}
          </Button>
          {photos.length === 0
            ? <div className="text-muted small mt-2 text-center">Add at least 1 photo to register.</div>
            : <div className="text-muted small mt-2 text-center">You can edit details and rental terms anytime after registering.</div>}
        </div>
      </Card.Body>
    </Card>
  );
}

function VehicleCard({ vehicle, onChanged }: { vehicle: Vehicle; onChanged: () => void }) {
  const { endpoints } = useServices();

  // Inline editing of the vehicle's core details from the "My vehicles" list.
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState(vehicle.type);
  const [plateNumber, setPlate] = useState(vehicle.plateNumber);
  const [make, setMake] = useState(vehicle.make ?? '');
  const [model, setModel] = useState(vehicle.model ?? '');
  const [color, setColor] = useState(vehicle.color ?? '');
  const [year, setYear] = useState(vehicle.year ? String(vehicle.year) : '');
  const [description, setDescription] = useState(vehicle.description ?? '');

  // Rental listing — editable after registration so an owner can offer (or stop
  // offering) an existing vehicle for rent once it's verified.
  const currentTaka = vehicle.rentalPriceMinor ? String(vehicle.rentalPriceMinor / 100) : '';
  const currentPeriod = vehicle.rentalPeriod ?? 'monthly';
  const [forRent, setForRent] = useState(vehicle.forRent);
  const [rentTaka, setRentTaka] = useState(currentTaka);
  const [rentPeriod, setRentPeriod] = useState(currentPeriod);
  const [rentalTerms, setRentalTerms] = useState(vehicle.rentalTerms ?? '');

  const setStatus = useMutation({
    mutationFn: (status: string) => endpoints.vehicles.setStatus(vehicle.id, status),
    onSuccess: onChanged,
  });
  const saveEdit = useMutation({
    mutationFn: () =>
      endpoints.vehicles.update(vehicle.id, {
        type,
        plateNumber: plateNumber.trim(),
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        color: color.trim() || undefined,
        year: year ? Number(year) : undefined,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
  });
  const saveRental = useMutation({
    mutationFn: () =>
      endpoints.vehicles.update(vehicle.id, {
        forRent,
        rentalPriceMinor: forRent && rentTaka ? takaToMinor(Number(rentTaka)) : undefined,
        rentalPeriod: forRent ? rentPeriod : undefined,
        rentalTerms: forRent ? rentalTerms.trim() || undefined : undefined,
      }),
    onSuccess: onChanged,
  });

  const verified = vehicle.verificationStatus === 'approved';
  const editDirty =
    type !== vehicle.type ||
    plateNumber.trim() !== vehicle.plateNumber ||
    make.trim() !== (vehicle.make ?? '') ||
    model.trim() !== (vehicle.model ?? '') ||
    color.trim() !== (vehicle.color ?? '') ||
    year !== (vehicle.year ? String(vehicle.year) : '') ||
    description.trim() !== (vehicle.description ?? '');
  const rentalDirty =
    forRent !== vehicle.forRent ||
    (forRent && (rentTaka !== currentTaka || rentPeriod !== currentPeriod || rentalTerms !== (vehicle.rentalTerms ?? '')));

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
            {vehicle.forRent && vehicle.rentalPriceMinor ? ` · ${formatBDT(vehicle.rentalPriceMinor)} ${rentalPeriodSuffix(vehicle.rentalPeriod)}` : ''}
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
          disabled={setStatus.isPending || vehicle.isRentedOut}
          onChange={(e) => setStatus.mutate(e.target.value)}
          aria-label="Vehicle status"
        >
          {VEHICLE_STATUSES.map((s) => (
            <option key={s} value={s} disabled={s === 'active' && !verified}>{s}</option>
          ))}
        </Form.Select>
        {vehicle.isRentedOut
          ? <span className="text-muted small">Rented out — status locked until the rental ends</span>
          : !verified && <span className="text-muted small">Activate after verification</span>}
        <div className="ms-auto d-flex gap-2">
          <Button size="sm" variant="outline-success" onClick={() => setEditing((e) => !e)}>
            {editing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      </div>

      {editing && (
        <div className="border-top mt-3 pt-3">
          <Row className="g-2">
            <Col xs={6}>
              <Form.Select size="sm" value={type} onChange={(e) => setType(e.target.value)} aria-label="Vehicle type">
                {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Form.Select>
            </Col>
            <Col xs={6}><Form.Control size="sm" placeholder="Plate number" value={plateNumber} onChange={(e) => setPlate(e.target.value)} /></Col>
            <Col xs={6}><Form.Control size="sm" placeholder="Brand" value={make} onChange={(e) => setMake(e.target.value)} /></Col>
            <Col xs={6}><Form.Control size="sm" placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} /></Col>
            <Col xs={6}><Form.Control size="sm" placeholder="Color" value={color} onChange={(e) => setColor(e.target.value)} /></Col>
            <Col xs={6}><Form.Control size="sm" type="number" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} /></Col>
            <Col xs={12}>
              <Form.Control as="textarea" size="sm" rows={2} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            </Col>
          </Row>
          <div className="mt-2 d-flex align-items-center gap-2">
            <Button size="sm" variant="success" disabled={!plateNumber.trim() || !editDirty || saveEdit.isPending} onClick={() => saveEdit.mutate()}>
              {saveEdit.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            <Button size="sm" variant="outline-secondary" disabled={saveEdit.isPending} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
          {saveEdit.isError && (
            <Alert variant="danger" className="py-1 px-2 mt-2 mb-0 small">
              {saveEdit.error instanceof ApiError ? saveEdit.error.message : 'Could not save changes.'}
            </Alert>
          )}
        </div>
      )}

      <div className="border-top mt-3 pt-3">
        <Form.Check
          type="switch"
          id={`forRent-${vehicle.id}`}
          label="Offer this vehicle for rent to drivers"
          checked={forRent}
          disabled={!verified || saveRental.isPending}
          onChange={(e) => setForRent(e.target.checked)}
        />
        {!verified && (
          <div className="text-muted small mt-1">
            Renting is locked while verification is {vehicle.verificationStatus}. You can offer this vehicle for rent once it's approved.
          </div>
        )}
        {forRent && (
          <>
            <div className="alert alert-secondary py-2 px-3 mt-2 mb-0 small">{RENTAL_STANDARD_TERMS}</div>
            <Row className="g-2 mt-0">
              <Col xs={7}>
                <Form.Control size="sm" type="number" placeholder="Rent amount (৳)" value={rentTaka} disabled={!verified || saveRental.isPending} onChange={(e) => setRentTaka(e.target.value)} />
              </Col>
              <Col xs={5}>
                <Form.Select size="sm" value={rentPeriod} disabled={!verified || saveRental.isPending} onChange={(e) => setRentPeriod(e.target.value)} aria-label="Rental period">
                  {RENTAL_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                </Form.Select>
              </Col>
              <Col xs={12}>
                <Form.Control size="sm" placeholder="Additional terms (optional)" value={rentalTerms} disabled={!verified || saveRental.isPending} onChange={(e) => setRentalTerms(e.target.value)} />
              </Col>
            </Row>
          </>
        )}
        <div className="mt-2 d-flex align-items-center gap-2">
          <Button size="sm" variant="success" disabled={!verified || !rentalDirty || saveRental.isPending} onClick={() => saveRental.mutate()}>
            {saveRental.isPending ? 'Saving…' : 'Save rental listing'}
          </Button>
          {saveRental.isSuccess && !rentalDirty && <span className="text-success small">Saved.</span>}
        </div>
        {saveRental.isError && (
          <Alert variant="danger" className="py-1 px-2 mt-2 mb-0 small">
            {saveRental.error instanceof ApiError ? saveRental.error.message : 'Could not update rental listing.'}
          </Alert>
        )}
      </div>
    </div>
  );
}
