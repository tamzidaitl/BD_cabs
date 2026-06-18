import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useCreateTicket, useMyTickets } from '@bd-cabs/core';

const CATEGORIES = [
  { value: 'complaint', label: 'Complaint' },
  { value: 'fare-dispute', label: 'Dispute a fare' },
  { value: 'other', label: 'Other' },
];

/** Raise complaints / fare disputes and track your support tickets. */
export default function SupportPage() {
  const tickets = useMyTickets();
  const create = useCreateTicket();

  const [category, setCategory] = useState('complaint');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      { category, subject: subject.trim(), body: body.trim() },
      { onSuccess: () => { setSubject(''); setBody(''); } },
    );
  }

  return (
    <Row className="g-4">
      <Col xs={12} lg={6}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h1 className="h5 mb-3">Raise a request</h1>
            {create.isSuccess && <Alert variant="success">Ticket submitted — we&apos;ll be in touch.</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Category</Form.Label>
                <Form.Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Subject</Form.Label>
                <Form.Control value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={150} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Details</Form.Label>
                <Form.Control as="textarea" rows={4} value={body} onChange={(e) => setBody(e.target.value)} required maxLength={2000} />
              </Form.Group>
              <Button type="submit" variant="success" disabled={create.isPending || !subject.trim() || !body.trim()}>
                {create.isPending ? 'Submitting…' : 'Submit ticket'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Col>

      <Col xs={12} lg={6}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted mb-3">My tickets</h2>
            {tickets.isLoading && <Spinner animation="border" size="sm" variant="success" />}
            {tickets.data && tickets.data.length === 0 && <p className="text-muted mb-0">No tickets yet.</p>}
            <div className="list-group list-group-flush">
              {tickets.data?.map((t) => (
                <div key={t.id} className="list-group-item px-0">
                  <div className="d-flex justify-content-between">
                    <span className="fw-medium">{t.subject}</span>
                    <Badge bg={t.status === 'resolved' ? 'success' : t.status === 'closed' ? 'secondary' : 'warning'}>{t.status}</Badge>
                  </div>
                  <div className="text-muted small">{t.category} · {new Date(t.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
