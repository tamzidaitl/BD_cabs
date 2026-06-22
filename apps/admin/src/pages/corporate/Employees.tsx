import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import {
  ApiError,
  CorporateEmployeeStatus,
  queryKeys,
  useServices,
  type CorporateEmployee,
  type CorporateEmployeeInput,
} from '@bd-cabs/core';
import { formatBDT, takaToMinor } from '@/lib/appNav';

/**
 * The employee roster. The company adds employees, sets each one's monthly
 * spend cap and whether their bookings need approval, and can suspend or remove
 * them. Each row also shows the spend used this calendar month.
 */
export default function CorporateEmployeesPage() {
  return (
    <Row className="g-4">
      <Col xs={12} lg={5}>
        <AddEmployeeCard />
      </Col>
      <Col xs={12} lg={7}>
        <RosterCard />
      </Col>
    </Row>
  );
}

function errMsg(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function AddEmployeeCard() {
  const qc = useQueryClient();
  const { endpoints } = useServices();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [limitTaka, setLimitTaka] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);

  const add = useMutation({
    mutationFn: () => {
      const body: CorporateEmployeeInput = {
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        monthlySpendLimitMinor: limitTaka ? takaToMinor(Number(limitTaka)) : undefined,
        requiresApproval,
      };
      return endpoints.corporate.addEmployee(body);
    },
    onSuccess: () => {
      setFullName('');
      setEmail('');
      setPhone('');
      setLimitTaka('');
      setRequiresApproval(false);
      void qc.invalidateQueries({ queryKey: queryKeys.corporate.employees() });
    },
  });

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h1 className="h5 mb-3">Add employee</h1>
        {add.isError && (
          <Alert variant="danger" className="py-2">{errMsg(add.error, 'Could not add employee.')}</Alert>
        )}
        <Form.Group className="mb-2">
          <Form.Label className="small text-muted mb-1">Full name</Form.Label>
          <Form.Control value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label className="small text-muted mb-1">Email (optional)</Form.Label>
          <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label className="small text-muted mb-1">Phone (optional)</Form.Label>
          <Form.Control value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801712345678" />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label className="small text-muted mb-1">Monthly spend cap, ৳ (optional)</Form.Label>
          <Form.Control type="number" min={0} value={limitTaka} onChange={(e) => setLimitTaka(e.target.value)} placeholder="No cap" />
        </Form.Group>
        <Form.Check
          className="mb-3"
          id="add-requires-approval"
          type="checkbox"
          label="Bookings need approval"
          checked={requiresApproval}
          onChange={(e) => setRequiresApproval(e.target.checked)}
        />
        <Button
          variant="success"
          disabled={!fullName.trim() || add.isPending}
          onClick={() => add.mutate()}
        >
          {add.isPending ? 'Adding…' : 'Add employee'}
        </Button>
      </Card.Body>
    </Card>
  );
}

function RosterCard() {
  const { endpoints } = useServices();
  const employees = useQuery({
    queryKey: queryKeys.corporate.employees(),
    queryFn: () => endpoints.corporate.employees(),
  });

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h2 className="h6 text-uppercase text-muted mb-3">Employees</h2>
        {employees.isLoading && <Spinner animation="border" size="sm" variant="success" />}
        {employees.data && employees.data.length === 0 && (
          <p className="text-muted mb-0">No employees yet.</p>
        )}
        {employees.data?.map((e) => <EmployeeRow key={e.id} employee={e} />)}
      </Card.Body>
    </Card>
  );
}

function EmployeeRow({ employee }: { employee: CorporateEmployee }) {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const [editing, setEditing] = useState(false);
  const [limitTaka, setLimitTaka] = useState(
    employee.monthlySpendLimitMinor != null ? String(employee.monthlySpendLimitMinor / 100) : '',
  );
  const [requiresApproval, setRequiresApproval] = useState(employee.requiresApproval);

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.corporate.employees() });

  // Carry the unchanged identity fields through every update.
  const baseBody = (): CorporateEmployeeInput => ({
    fullName: employee.fullName,
    email: employee.email ?? undefined,
    phone: employee.phone ?? undefined,
    monthlySpendLimitMinor: employee.monthlySpendLimitMinor,
    requiresApproval: employee.requiresApproval,
    status: employee.status,
  });

  const save = useMutation({
    mutationFn: () =>
      endpoints.corporate.updateEmployee(employee.id, {
        ...baseBody(),
        monthlySpendLimitMinor: limitTaka ? takaToMinor(Number(limitTaka)) : undefined,
        requiresApproval,
      }),
    onSuccess: () => {
      setEditing(false);
      invalidate();
    },
  });

  const toggleStatus = useMutation({
    mutationFn: () =>
      endpoints.corporate.updateEmployee(employee.id, {
        ...baseBody(),
        status:
          employee.status === CorporateEmployeeStatus.Active
            ? CorporateEmployeeStatus.Suspended
            : CorporateEmployeeStatus.Active,
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: () => endpoints.corporate.removeEmployee(employee.id),
    onSuccess: invalidate,
  });

  const suspended = employee.status === CorporateEmployeeStatus.Suspended;
  const limitLabel = employee.monthlySpendLimitMinor != null ? formatBDT(employee.monthlySpendLimitMinor) : 'No cap';

  return (
    <div className="border-bottom py-3">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="fw-medium">
            {employee.fullName}{' '}
            {employee.requiresApproval && <Badge bg="info" className="ms-1">approval</Badge>}
          </div>
          <div className="text-muted small">{employee.email ?? employee.phone ?? '—'}</div>
          <div className="small mt-1">
            <span className="text-muted">Used </span>
            <span className="fw-medium">{formatBDT(employee.spentThisMonthMinor)}</span>
            <span className="text-muted"> of {limitLabel} this month</span>
          </div>
        </div>
        <Badge bg={suspended ? 'secondary' : 'success'}>{employee.status}</Badge>
      </div>

      {(save.isError || toggleStatus.isError || remove.isError) && (
        <Alert variant="danger" className="py-1 px-2 my-2 small">
          {errMsg(save.error ?? toggleStatus.error ?? remove.error, 'Action failed.')}
        </Alert>
      )}

      {editing ? (
        <Row className="g-2 align-items-center mt-1">
          <Col xs="auto">
            <Form.Control
              size="sm"
              type="number"
              min={0}
              placeholder="Cap (৳)"
              value={limitTaka}
              onChange={(e) => setLimitTaka(e.target.value)}
              style={{ width: 140 }}
            />
          </Col>
          <Col xs="auto">
            <Form.Check
              id={`edit-approval-${employee.id}`}
              type="checkbox"
              label="Needs approval"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
            />
          </Col>
          <Col xs="auto" className="d-flex gap-2">
            <Button size="sm" variant="success" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="outline-secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </Col>
        </Row>
      ) : (
        <div className="d-flex gap-2 mt-2">
          <Button size="sm" variant="outline-secondary" onClick={() => setEditing(true)}>Edit limits</Button>
          <Button
            size="sm"
            variant={suspended ? 'outline-success' : 'outline-warning'}
            disabled={toggleStatus.isPending}
            onClick={() => toggleStatus.mutate()}
          >
            {suspended ? 'Reactivate' : 'Suspend'}
          </Button>
          <Button size="sm" variant="outline-danger" disabled={remove.isPending} onClick={() => remove.mutate()}>
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
