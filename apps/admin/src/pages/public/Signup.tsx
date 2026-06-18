import { useMemo, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { homePathForRole } from '@/lib/appNav';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Dropdown,
  DropdownButton,
  Form,
  InputGroup,
  Row,
} from 'react-bootstrap';
import { Check, ChevronLeft } from 'lucide-react';
import * as Icons from 'lucide-react';
import {
  ApiError,
  COUNTRY_CODES,
  DEFAULT_COUNTRY_CODE,
  GENDERS,
  SIGNUP_ROLES,
  buildE164Phone,
  getSignupRole,
  useRegister,
  validateSignupAccount,
  type Role,
  type SignupAccountValues,
  type SignupErrors,
  type SignupRoleInfo,
} from '@bd-cabs/core';

type IconCmp = ComponentType<{ size?: number; className?: string }>;
const icon = (name: string): IconCmp =>
  (Icons[name as keyof typeof Icons] ?? Icons.Circle) as IconCmp;

/**
 * Flag image from flagcdn (keyed by ISO 3166-1 alpha-2). Uses an <img>, not an
 * emoji flag, because Windows browsers don't render regional-indicator emoji —
 * they'd show the bare country letters instead.
 */
function Flag({ iso }: { iso: string }) {
  const code = iso.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/24x18/${code}.png`}
      srcSet={`https://flagcdn.com/48x36/${code}.png 2x`}
      width={24}
      height={18}
      alt=""
      className="rounded-1"
    />
  );
}

const EMPTY_ACCOUNT: SignupAccountValues = {
  firstName: '',
  lastName: '',
  gender: '',
  countryCode: DEFAULT_COUNTRY_CODE,
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
};

/**
 * Inclusive, step-by-step self-signup for all four self-registerable roles
 * (Customer, Driver, Fleet/Vehicle Owner, Corporate). One unified wizard:
 *   0 — choose account type
 *   1 — account details (validated via the shared core validator)
 *   2 — review + agreements (respects the activation gate)
 * then a success screen with role-specific next steps.
 *
 * Registration hits the real POST /auth/register; the role's activation status
 * (Customer active vs others pending) is enforced by the backend.
 */
export default function SignupPage() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [account, setAccount] = useState<SignupAccountValues>(EMPTY_ACCOUNT);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [ackVerification, setAckVerification] = useState(false);
  const [done, setDone] = useState(false);

  const register = useRegister();
  const roleInfo: SignupRoleInfo | undefined = useMemo(
    () => (role ? getSignupRole(role) : undefined),
    [role],
  );

  function set<K extends keyof SignupAccountValues>(key: K, value: string) {
    setAccount((a) => ({ ...a, [key]: value }));
  }

  function selectRole(r: Role) {
    setRole(r);
    setStep(1);
  }

  function handleDetailsNext(e: React.FormEvent) {
    e.preventDefault();
    const found = validateSignupAccount(account);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep(2);
  }

  async function handleSubmit() {
    if (!role) return;
    await register.mutateAsync({
      firstName: account.firstName.trim(),
      lastName: account.lastName.trim(),
      gender: account.gender,
      email: account.email.trim(),
      phone: buildE164Phone(account.countryCode, account.phone),
      password: account.password,
      role,
    });
    setDone(true);
  }

  const submitError = register.error
    ? register.error instanceof ApiError
      ? register.error.message
      : 'Something went wrong. Please try again.'
    : null;

  const canSubmit =
    acceptTerms && (roleInfo?.activeImmediately ? true : ackVerification) && !register.isPending;

  // Codes are unique in COUNTRY_CODES, so matching by code is safe.
  const selectedCountry =
    COUNTRY_CODES.find((c) => c.code === account.countryCode) ?? COUNTRY_CODES[0];

  return (
    <div className="bg-light">
      <div className="container py-4 py-md-5" style={{ maxWidth: 820 }}>
        {done && roleInfo ? (
          <SuccessCard roleInfo={roleInfo} homePath={homePathForRole(role)} />
        ) : (
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-3 p-md-4">
              <div className="text-center mb-4">
                <h1 className="h3 fw-bold mb-1">Create your BD Cabs account</h1>
                <p className="text-muted mb-0">One signup for riders, drivers, owners &amp; companies.</p>
              </div>

              {/* Step 0 — account type */}
              {step === 0 && (
                <Row className="g-3 mt-1">
                  {SIGNUP_ROLES.map((r) => {
                    const Icon = icon(r.icon);
                    const active = role === r.role;
                    return (
                      <Col xs={12} sm={6} key={r.role}>
                        <button
                          type="button"
                          onClick={() => selectRole(r.role)}
                          className={`card h-100 w-100 text-start p-0 shadow-sm border-2 ${
                            active ? 'border-success' : 'border-light'
                          }`}
                        >
                          <div className="card-body">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <span
                                className="d-inline-flex align-items-center justify-content-center rounded-3 bg-success-subtle text-success"
                                style={{ width: 44, height: 44 }}
                              >
                                <Icon size={22} />
                              </span>
                              <div>
                                <div className="fw-semibold">{r.label}</div>
                                <div className="text-muted small">{r.tagline}</div>
                              </div>
                            </div>
                            <p className="text-muted small mb-2">{r.description}</p>
                            <Badge bg={r.activeImmediately ? 'success' : 'warning'} text={r.activeImmediately ? undefined : 'dark'}>
                              {r.activeImmediately ? 'Active immediately' : 'Verification required'}
                            </Badge>
                          </div>
                        </button>
                      </Col>
                    );
                  })}
                </Row>
              )}

              {/* Step 1 — details */}
              {step === 1 && roleInfo && (
                <Form onSubmit={handleDetailsNext} className="mt-2" noValidate>
                  <div className="text-muted small mb-3">
                    Signing up as <span className="fw-semibold text-body">{roleInfo.label}</span>
                  </div>
                  <Row className="g-3">
                    <Col xs={12} md={6}>
                      <Form.Group controlId="firstName">
                        <Form.Label>First name</Form.Label>
                        <Form.Control
                          value={account.firstName}
                          onChange={(e) => set('firstName', e.target.value)}
                          isInvalid={!!errors.firstName}
                          placeholder="e.g. Rahim"
                        />
                        <Form.Control.Feedback type="invalid">{errors.firstName}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group controlId="lastName">
                        <Form.Label>Last name</Form.Label>
                        <Form.Control
                          value={account.lastName}
                          onChange={(e) => set('lastName', e.target.value)}
                          isInvalid={!!errors.lastName}
                          placeholder="e.g. Uddin"
                        />
                        <Form.Control.Feedback type="invalid">{errors.lastName}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group controlId="gender">
                        <Form.Label>Gender</Form.Label>
                        <Form.Select
                          value={account.gender}
                          onChange={(e) => set('gender', e.target.value)}
                          isInvalid={!!errors.gender}
                        >
                          <option value="">Select gender…</option>
                          {GENDERS.map((g) => (
                            <option key={g.value} value={g.value}>
                              {g.label}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">{errors.gender}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group controlId="email">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                          type="email"
                          value={account.email}
                          onChange={(e) => set('email', e.target.value)}
                          isInvalid={!!errors.email}
                          placeholder="you@example.com"
                        />
                        <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group controlId="phone">
                        <Form.Label>Phone</Form.Label>
                        <InputGroup hasValidation>
                          <DropdownButton
                            variant=""
                            id="country-code"
                            title={
                              <span className="d-inline-flex align-items-center gap-2">
                                <Flag iso={selectedCountry.iso} />
                                {selectedCountry.code}
                              </span>
                            }
                          >
                            {COUNTRY_CODES.map((c) => (
                              <Dropdown.Item
                                key={c.iso}
                                active={c.code === account.countryCode}
                                onClick={() => set('countryCode', c.code)}
                              >
                                <span className="d-flex align-items-center gap-2">
                                  <Flag iso={c.iso} />
                                  <span>{c.country}</span>
                                  <span className="ms-auto text-muted">{c.code}</span>
                                </span>
                              </Dropdown.Item>
                            ))}
                          </DropdownButton>
                          <Form.Control
                            type="tel"
                            value={account.phone}
                            onChange={(e) => set('phone', e.target.value)}
                            isInvalid={!!errors.phone}
                            placeholder="1712 345678"
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.phone ?? errors.countryCode}
                          </Form.Control.Feedback>
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group controlId="password">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                          type="password"
                          value={account.password}
                          onChange={(e) => set('password', e.target.value)}
                          isInvalid={!!errors.password}
                          autoComplete="new-password"
                        />
                        <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Group controlId="confirmPassword">
                        <Form.Label>Confirm password</Form.Label>
                        <Form.Control
                          type="password"
                          value={account.confirmPassword}
                          onChange={(e) => set('confirmPassword', e.target.value)}
                          isInvalid={!!errors.confirmPassword}
                          autoComplete="new-password"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.confirmPassword}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-between mt-4">
                    <Button variant="link" className="text-muted text-decoration-none px-0" onClick={() => setStep(0)}>
                      <ChevronLeft size={16} /> Back
                    </Button>
                    <Button type="submit" variant="success">
                      Continue
                    </Button>
                  </div>
                </Form>
              )}

              {/* Step 2 — review + agreements */}
              {step === 2 && roleInfo && (
                <div className="mt-2">
                  <Row className="g-3">
                    <Col xs={12} md={roleInfo.activeImmediately ? 12 : 6}>
                      <SummaryCard roleInfo={roleInfo} account={account} />
                    </Col>
                    {!roleInfo.activeImmediately && (
                      <Col xs={12} md={6}>
                        <Card className="border-0 bg-light h-100">
                          <Card.Body>
                            <div className="fw-semibold mb-2">Before you can transact</div>
                            <p className="text-muted small mb-2">
                              Your account starts as <Badge bg="warning" text="dark">pending</Badge> and is
                              activated after we verify:
                            </p>
                            <ul className="text-muted small mb-0 ps-3">
                              {roleInfo.requirements.map((req) => (
                                <li key={req}>{req}</li>
                              ))}
                            </ul>
                          </Card.Body>
                        </Card>
                      </Col>
                    )}
                  </Row>

                  {submitError && (
                    <Alert variant="danger" className="mt-3 mb-0">
                      {submitError}
                    </Alert>
                  )}

                  <Form.Check
                    className="mt-3"
                    id="terms"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    label="I agree to the BD Cabs Terms of Service and Privacy Policy."
                  />
                  {!roleInfo.activeImmediately && (
                    <Form.Check
                      className="mt-2"
                      id="verify-ack"
                      checked={ackVerification}
                      onChange={(e) => setAckVerification(e.target.checked)}
                      label="I understand my account requires verification before it is activated."
                    />
                  )}

                  <div className="d-flex justify-content-between mt-4">
                    <Button variant="link" className="text-muted text-decoration-none px-0" onClick={() => setStep(1)}>
                      <ChevronLeft size={16} /> Back
                    </Button>
                    <Button variant="success" disabled={!canSubmit} onClick={handleSubmit}>
                      {register.isPending ? 'Creating account…' : 'Create account'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="text-center text-muted small mt-4">
                Already have an account?{' '}
                <Link to="/login" className="text-success text-decoration-none">
                  Sign in
                </Link>
              </div>
            </Card.Body>
          </Card>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  roleInfo,
  account,
}: {
  roleInfo: SignupRoleInfo;
  account: SignupAccountValues;
}) {
  const genderLabel = GENDERS.find((g) => g.value === account.gender)?.label ?? account.gender;
  const rows: [string, string][] = [
    ['Account type', roleInfo.label],
    ['Name', `${account.firstName} ${account.lastName}`.trim()],
    ['Gender', genderLabel],
    ['Email', account.email],
    ['Phone', buildE164Phone(account.countryCode, account.phone)],
  ];
  return (
    <Card className="border-0 bg-light h-100">
      <Card.Body>
        <div className="fw-semibold mb-2">Review your details</div>
        <dl className="row mb-0 small">
          {rows.map(([k, v]) => (
            <div className="col-12 d-flex justify-content-between py-1 border-bottom" key={k}>
              <dt className="text-muted fw-normal">{k}</dt>
              <dd className="mb-0 text-end fw-medium text-truncate ps-2">{v}</dd>
            </div>
          ))}
        </dl>
      </Card.Body>
    </Card>
  );
}

function SuccessCard({ roleInfo, homePath }: { roleInfo: SignupRoleInfo; homePath: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4 p-md-5 text-center">
        <span
          className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success text-white mb-3"
          style={{ width: 64, height: 64 }}
        >
          <Check size={32} />
        </span>
        <h1 className="h4 fw-bold mb-2">Account created</h1>
        <p className="text-muted mb-1">
          Welcome to BD Cabs as a <span className="fw-semibold text-body">{roleInfo.label}</span>.
          You&apos;re signed in and ready to go.
        </p>
        <p className="text-muted" style={{ maxWidth: 480, margin: '0 auto' }}>
          {roleInfo.nextSteps}
        </p>
        <div className="d-flex justify-content-center gap-2 mt-4">
          <Link to={homePath} className="btn btn-success">
            Continue
          </Link>
          <Link to="/support" className="btn btn-outline-secondary">
            Get support
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
}
