import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Trash2 } from 'lucide-react';
import { queryKeys, useSavePlace, useSavedPlaces, useServices } from '@bd-cabs/core';
import { DHAKA_PLACES, placeAt } from '@/lib/appNav';

/** Saved favourite locations (Home/Work/…) plus recently used destinations. */
export default function PlacesPage() {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const places = useSavedPlaces();
  const save = useSavePlace();

  const recent = useQuery({
    queryKey: queryKeys.places.recent(),
    queryFn: () => endpoints.places.recent(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => endpoints.places.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.places.list() }),
  });

  const [label, setLabel] = useState('Home');
  const [spotIdx, setSpotIdx] = useState(0);

  function handleSave() {
    const spot = placeAt(spotIdx);
    save.mutate(
      { label: label.trim(), address: spot.name, lat: spot.lat, lng: spot.lng },
      { onSuccess: () => setLabel('') },
    );
  }

  return (
    <Row className="g-4">
      <Col xs={12} lg={7}>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <h1 className="h5 mb-3">Saved places</h1>
            {places.isLoading && <Spinner animation="border" size="sm" variant="success" />}
            {places.data && places.data.length === 0 && <p className="text-muted">No saved places yet.</p>}
            {places.data?.map((p) => (
              <div key={p.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                  <div className="fw-medium">{p.label}</div>
                  <div className="text-muted small">{p.address}</div>
                </div>
                <Button size="sm" variant="outline-danger" onClick={() => remove.mutate(p.id)} aria-label="Delete">
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </Card.Body>
        </Card>

        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted mb-3">Add a place</h2>
            <Row className="g-2">
              <Col xs={12} sm={4}>
                <Form.Control placeholder="Label (Home)" value={label} onChange={(e) => setLabel(e.target.value)} />
              </Col>
              <Col xs={12} sm={5}>
                <Form.Select value={spotIdx} onChange={(e) => setSpotIdx(Number(e.target.value))}>
                  {DHAKA_PLACES.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
                </Form.Select>
              </Col>
              <Col xs={12} sm={3} className="d-grid">
                <Button variant="success" disabled={!label.trim() || save.isPending} onClick={handleSave}>Save</Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>

      <Col xs={12} lg={5}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted mb-3">Recent destinations</h2>
            {recent.data && recent.data.length === 0 && <p className="text-muted mb-0">No recent trips yet.</p>}
            <ul className="list-unstyled mb-0">
              {recent.data?.map((p, i) => (
                <li key={`${p.address}-${i}`} className="border-bottom py-2">
                  <div className="fw-medium">{p.address}</div>
                  <div className="text-muted small">{new Date(p.usedAt).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
