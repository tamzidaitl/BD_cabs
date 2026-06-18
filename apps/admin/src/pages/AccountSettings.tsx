import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Container,
  Form,
  Spinner,
  ToggleButton,
} from 'react-bootstrap';
import { ArrowLeft, Camera } from 'lucide-react';
import {
  ApiError,
  AvailabilityMode,
  Role,
  VerificationStatus,
  queryKeys,
  useAuthStore,
  useChangePassword,
  useCurrentUser,
  useDriverProfile,
  useServices,
  useSetAvailabilityMode,
  useUpdateProfile,
  useUploadAvatar,
} from '@bd-cabs/core';
import { Avatar } from '@/components/Avatar';
import { homePathForRole } from '@/lib/appNav';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Self-service account settings for every signed-in role. Profile (name +
 * photo) and password are available to all; the owner verification (KYC)
 * section renders only for fleet owners and the availability section only for
 * drivers. Reached from the "Account settings" item in each chrome's profile
 * dropdown.
 */
export default function AccountSettings() {
  const role = useAuthStore((s) => s.session?.role);
  const { data: user } = useCurrentUser();
  const home = homePathForRole(role);

  return (
    <div className="min-vh-100 bg-light">
      <div className="bg-white border-bottom">
        <Container className="py-3 d-flex align-items-center gap-3" style={{ maxWidth: 720 }}>
          <Link to={home} className="btn btn-light btn-sm" aria-label="Back">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="h5 mb-0">Account settings</h1>
        </Container>
      </div>

      <Container className="py-4 d-flex flex-column gap-4" style={{ maxWidth: 720 }}>
        <ProfileSection
          fullName={user?.fullName ?? ''}
          avatarUser={user ?? null}
        />
        {role === Role.FleetOwner && <FleetKycSection />}
        <PasswordSection />
        {role === Role.Driver && <AvailabilitySection />}
      </Container>
    </div>
  );
}

// ---- Profile (name + photo) ------------------------------------------------

function ProfileSection({
  fullName,
  avatarUser,
}: {
  fullName: string;
  avatarUser: { fullName?: string; avatarUrl?: string | null } | null;
}) {
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(fullName);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'danger'; text: string } | null>(null);

  // Keep the field in sync once /auth/me resolves.
  useEffect(() => setName(fullName), [fullName]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await updateProfile.mutateAsync({ fullName: name.trim() });
      setFeedback({ kind: 'success', text: 'Profile updated.' });
    } catch (err) {
      setFeedback({ kind: 'danger', text: errorMessage(err, 'Could not update profile.') });
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setFeedback(null);
    try {
      await uploadAvatar.mutateAsync(file);
      setFeedback({ kind: 'success', text: 'Photo updated.' });
    } catch (err) {
      setFeedback({ kind: 'danger', text: errorMessage(err, 'Could not upload photo.') });
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h2 className="h6 mb-3">Profile</h2>

        {feedback && <Alert variant={feedback.kind}>{feedback.text}</Alert>}

        <div className="d-flex align-items-center gap-3 mb-4">
          <Avatar user={avatarUser} size={72} />
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="d-none"
              onChange={handlePhoto}
            />
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploadAvatar.isPending}
            >
              <Camera size={16} className="me-2" />
              {uploadAvatar.isPending ? 'Uploading…' : 'Change photo'}
            </Button>
            <div className="text-muted small mt-1">JPEG, PNG, WebP or GIF, up to 5 MB.</div>
          </div>
        </div>

        <Form onSubmit={handleSaveName}>
          <Form.Group className="mb-3" controlId="fullName">
            <Form.Label>Display name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>
          <Button
            type="submit"
            variant="success"
            disabled={updateProfile.isPending || name.trim() === fullName.trim()}
          >
            {updateProfile.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}

// ---- Password --------------------------------------------------------------

function PasswordSection() {
  const changePassword = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setDone(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(errorMessage(err, 'Could not change password.'));
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h2 className="h6 mb-3">Change password</h2>

        {done && <Alert variant="success">Your password has been changed.</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="currentPassword">
            <Form.Label>Current password</Form.Label>
            <Form.Control
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="newPassword">
            <Form.Label>New password</Form.Label>
            <Form.Control
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="confirmPassword">
            <Form.Label>Confirm new password</Form.Label>
            <Form.Control
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Button type="submit" variant="success" disabled={changePassword.isPending}>
            {changePassword.isPending ? 'Saving…' : 'Change password'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}

// ---- Owner verification / KYC (fleet owners only) -------------------------

function FleetKycSection() {
  const qc = useQueryClient();
  const { endpoints } = useServices();

  const profile = useQuery({
    queryKey: queryKeys.fleet.me(),
    queryFn: () => endpoints.fleet.me(),
    retry: false,
  });
  const status = profile.data?.verificationStatus;

  const [companyName, setCompanyName] = useState('');
  const [tradeLicenseNumber, setTradeLicense] = useState('');
  const [nidNumber, setNid] = useState('');
  const [bankAccount, setBank] = useState('');

  const onboard = useMutation({
    mutationFn: () =>
      endpoints.fleet.onboard({
        companyName: companyName.trim() || undefined,
        tradeLicenseNumber: tradeLicenseNumber.trim(),
        nidNumber: nidNumber.trim(),
        bankAccount: bankAccount.trim() || undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fleet.me() }),
  });

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h6 mb-0">Owner verification (KYC)</h2>
          {status && (
            <Badge bg={status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning'} text={status === 'pending' ? 'dark' : undefined}>
              {status}
            </Badge>
          )}
        </div>
        {onboard.isSuccess && <Alert variant="success" className="py-2">KYC submitted for review.</Alert>}
        {onboard.isError && (
          <Alert variant="danger" className="py-2">{onboard.error instanceof ApiError ? onboard.error.message : 'Submission failed.'}</Alert>
        )}
        <Form.Group className="mb-2">
          <Form.Label className="small text-muted mb-1">Company name (optional)</Form.Label>
          <Form.Control value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Sample Fleet Ltd." />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label className="small text-muted mb-1">Trade licence number</Form.Label>
          <Form.Control value={tradeLicenseNumber} onChange={(e) => setTradeLicense(e.target.value)} placeholder="TRAD-000123" />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label className="small text-muted mb-1">NID number</Form.Label>
          <Form.Control value={nidNumber} onChange={(e) => setNid(e.target.value)} placeholder="1990123456789" />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label className="small text-muted mb-1">Bank account (for payouts)</Form.Label>
          <Form.Control value={bankAccount} onChange={(e) => setBank(e.target.value)} placeholder="Account / MFS number" />
        </Form.Group>
        <Button variant="success" disabled={!tradeLicenseNumber.trim() || !nidNumber.trim() || onboard.isPending} onClick={() => onboard.mutate()}>
          {onboard.isPending ? 'Submitting…' : 'Submit KYC'}
        </Button>
      </Card.Body>
    </Card>
  );
}

// ---- Availability (drivers only) ------------------------------------------

const MODES: { value: AvailabilityMode; label: string; hint: string }[] = [
  { value: AvailabilityMode.Online, label: 'Online', hint: 'Visible to riders and receiving requests.' },
  { value: AvailabilityMode.Offline, label: 'Offline', hint: 'Hidden — you won’t get any requests.' },
  { value: AvailabilityMode.Auto, label: 'Auto', hint: 'The app keeps you available while it’s open.' },
];

function AvailabilitySection() {
  const { data: driver, isLoading } = useDriverProfile();
  const setMode = useSetAvailabilityMode();
  const [error, setError] = useState<string | null>(null);

  const current = driver?.availabilityMode ?? AvailabilityMode.Offline;
  const approved = driver?.verificationStatus === VerificationStatus.Approved;

  async function choose(mode: AvailabilityMode) {
    if (mode === current) return;
    setError(null);
    try {
      await setMode.mutateAsync(mode);
    } catch (err) {
      setError(errorMessage(err, 'Could not update availability.'));
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h2 className="h6 mb-3">Availability</h2>

        {error && <Alert variant="danger">{error}</Alert>}
        {!approved && (
          <Alert variant="warning" className="small">
            Your account must be verified before you can go online or use Auto.
          </Alert>
        )}

        {isLoading ? (
          <Spinner animation="border" variant="success" size="sm" />
        ) : (
          <>
            <ButtonGroup className="w-100 mb-2">
              {MODES.map((m) => {
                const disabled =
                  setMode.isPending || (!approved && m.value !== AvailabilityMode.Offline);
                return (
                  <ToggleButton
                    key={m.value}
                    id={`mode-${m.value}`}
                    type="radio"
                    name="availability-mode"
                    value={m.value}
                    variant={current === m.value ? 'success' : 'outline-success'}
                    checked={current === m.value}
                    disabled={disabled}
                    onChange={() => choose(m.value)}
                  >
                    {m.label}
                  </ToggleButton>
                );
              })}
            </ButtonGroup>
            <div className="text-muted small">
              {MODES.find((m) => m.value === current)?.hint}
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
