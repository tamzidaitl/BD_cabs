import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import {
  queryKeys,
  RentalStatus,
  ReviewTargetType,
  useAuthStore,
  useRentalReviews,
  useServices,
  type RentalAgreement,
  type RentalVehicleListing,
} from '@bd-cabs/core';
import { formatBDT, RENTAL_STANDARD_TERMS, rentalPeriodSuffix } from '@/lib/appNav';
import { RatingCard } from '@/components/RatingCard';

const VEHICLE_TAGS = ['Clean', 'Reliable', 'Comfortable', 'Good condition', 'Fuel efficient', 'As described'];
const OWNER_TAGS = ['Fair terms', 'Responsive', 'Easy handover', 'Helpful', 'Honest', 'Would rent again'];

/**
 * Rental-driver tools: browse owner-offered vehicles, request one, and pay rent
 * on an approved/active agreement. (Only relevant to rental drivers.)
 */
export default function RentalsPage() {
  const qc = useQueryClient();
  const { endpoints } = useServices();

  const available = useQuery({
    queryKey: queryKeys.rentals.available(),
    queryFn: () => endpoints.rentals.availableVehicles(),
  });
  const mine = useQuery({
    queryKey: queryKeys.rentals.mine(),
    queryFn: () => endpoints.rentals.mine(),
  });

  const request = useMutation({
    mutationFn: (vehicleId: string) => endpoints.rentals.request({ vehicleId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rentals.mine() }),
  });

  // Ended rentals leave the active list and move to "Past rentals", where the
  // driver can rate the car and its owner.
  const agreements = mine.data ?? [];
  const active = agreements.filter((a) => a.status !== RentalStatus.Ended);
  const ended = agreements.filter((a) => a.status === RentalStatus.Ended);

  return (
    <Row className="g-4">
      <Col xs={12} lg={6}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h1 className="h5 mb-2">Vehicles for rent</h1>
            <div className="alert alert-secondary py-2 px-3 small">{RENTAL_STANDARD_TERMS}</div>
            {available.isLoading && <Spinner animation="border" size="sm" variant="success" />}
            {available.data && available.data.length === 0 && <p className="text-muted mb-0">No vehicles are offered for rent right now.</p>}
            {available.data?.map((listing) => (
              <RentalVehicleCard
                key={listing.vehicle.id}
                listing={listing}
                requesting={request.isPending}
                onRequest={() => request.mutate(listing.vehicle.id)}
              />
            ))}
          </Card.Body>
        </Card>
      </Col>

      <Col xs={12} lg={6}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h2 className="h6 text-uppercase text-muted mb-3">My rental agreements</h2>
            {mine.isLoading && <Spinner animation="border" size="sm" variant="success" />}
            {mine.data && active.length === 0 && <p className="text-muted mb-0">You have no active rental agreements.</p>}
            {active.map((a) => <AgreementCard key={a.id} agreement={a} />)}
          </Card.Body>
        </Card>

        {ended.length > 0 && (
          <Card className="border-0 shadow-sm mt-4">
            <Card.Body className="p-4">
              <h2 className="h6 text-uppercase text-muted mb-1">Past rentals</h2>
              <p className="text-muted small mb-3">These rentals have ended — rate the vehicle and the owner.</p>
              {ended.map((a) => <EndedAgreementCard key={a.id} agreement={a} />)}
            </Card.Body>
          </Card>
        )}
      </Col>
    </Row>
  );
}

/**
 * One rentable car in the marketplace: photos, the offering Fleet Owner (name,
 * company, rating), price/terms, and the vehicle's verified documents — so the
 * driver can size up a car and its owner before requesting it.
 */
function RentalVehicleCard({
  listing,
  requesting,
  onRequest,
}: {
  listing: RentalVehicleListing;
  requesting: boolean;
  onRequest: () => void;
}) {
  const { vehicle, owner, documents } = listing;
  return (
    <div className="border-bottom py-3">
      {vehicle.photoUrls.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-2">
          {vehicle.photoUrls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt={vehicle.plateNumber} className="rounded border" style={{ width: 80, height: 60, objectFit: 'cover' }} />
            </a>
          ))}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="fw-medium">{vehicle.make ?? vehicle.type} {vehicle.model ?? ''} · {vehicle.plateNumber}</div>
          <div className="text-muted small">
            {vehicle.rentalPriceMinor ? `${formatBDT(vehicle.rentalPriceMinor)} ${rentalPeriodSuffix(vehicle.rentalPeriod)}` : 'Terms on approval'}
          </div>
          {vehicle.rentalTerms && <div className="text-muted small fst-italic">{vehicle.rentalTerms}</div>}
        </div>
        <Button size="sm" variant="outline-success" disabled={requesting} onClick={onRequest}>Request</Button>
      </div>

      {owner && (
        <div className="d-flex align-items-center gap-2 mt-2">
          {owner.avatarUrl
            ? <img src={owner.avatarUrl} alt={owner.fullName} className="rounded-circle" style={{ width: 28, height: 28, objectFit: 'cover' }} />
            : <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success" style={{ width: 28, height: 28, fontSize: 12 }}>{owner.fullName.charAt(0)}</span>}
          <div className="small">
            <span className="fw-medium">{owner.companyName ?? owner.fullName}</span>
            {owner.companyName && <span className="text-muted"> · {owner.fullName}</span>}
          </div>
          <span className="small text-warning ms-auto">
            {owner.rating != null ? `★ ${owner.rating.toFixed(1)}` : <span className="text-muted">No rating yet</span>}
          </span>
        </div>
      )}

      {documents.length > 0 && (
        <div className="mt-2">
          <div className="text-uppercase text-muted small mb-1">Documents</div>
          <div className="d-flex flex-wrap gap-2">
            {documents.map((d) => (
              <a
                key={d.id}
                href={d.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-decoration-none"
              >
                <Badge
                  bg={d.verificationStatus === 'approved' ? 'success' : d.verificationStatus === 'rejected' ? 'danger' : 'warning'}
                  text={d.verificationStatus === 'approved' || d.verificationStatus === 'rejected' ? undefined : 'dark'}
                  className="text-capitalize fw-normal"
                  title={`${d.type} · ${d.verificationStatus}`}
                >
                  {d.type}{d.number ? ` · ${d.number}` : ''}
                </Badge>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgreementCard({ agreement }: { agreement: RentalAgreement }) {
  const qc = useQueryClient();
  const { endpoints } = useServices();
  const payable = agreement.status === 'Active' || agreement.status === 'Approved';

  const due = useQuery({
    queryKey: queryKeys.rentals.rentDue(agreement.id),
    queryFn: () => endpoints.rentals.rentDue(agreement.id),
    enabled: payable,
  });

  const pay = useMutation({
    mutationFn: (amountMinor: number) => endpoints.rentals.payRent(agreement.id, { amountMinor }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rentals.rentDue(agreement.id) }),
  });

  const { vehicle } = agreement;

  return (
    <div className="border-bottom py-3">
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div className="d-flex gap-2">
          {vehicle?.photoUrl
            ? <img src={vehicle.photoUrl} alt={vehicle.plateNumber} className="rounded border" style={{ width: 56, height: 42, objectFit: 'cover' }} />
            : <span className="d-inline-flex align-items-center justify-content-center rounded border bg-light text-muted" style={{ width: 56, height: 42, fontSize: 11 }}>No photo</span>}
          <div>
            <div className="fw-medium">
              {vehicle ? `${vehicle.make ?? vehicle.type} ${vehicle.model ?? ''} · ${vehicle.plateNumber}` : `Agreement ${agreement.id.slice(0, 8)}`}
            </div>
            <div className="text-muted small">
              {vehicle?.rentalPriceMinor != null
                ? `${formatBDT(vehicle.rentalPriceMinor)} ${rentalPeriodSuffix(vehicle.rentalPeriod)}`
                : agreement.rentType === 'fixed' && agreement.rentAmountMinor != null
                  ? `${formatBDT(agreement.rentAmountMinor)}/period`
                  : agreement.rentType === 'revenue-share'
                    ? `Revenue share ${agreement.revenueSharePct}%`
                    : 'Terms on approval'}
            </div>
            {agreement.endDate && (
              <div className="text-muted small">Rental ends {new Date(agreement.endDate).toLocaleDateString()}</div>
            )}
          </div>
        </div>
        <Badge bg={agreement.status === 'Active' ? 'success' : agreement.status === 'Rejected' ? 'danger' : 'secondary'}>{agreement.status}</Badge>
      </div>
      {payable && due.data && (
        <div className="mt-2">
          <div className="small text-muted">Rent due ({due.data.period}): <span className="fw-medium text-body">{formatBDT(due.data.amountDueMinor)}</span></div>
          {pay.isSuccess && <Alert variant="success" className="py-1 px-2 my-2 small">Rent paid.</Alert>}
          <Button
            size="sm"
            variant="success"
            className="mt-2"
            disabled={pay.isPending || due.data.amountDueMinor <= 0}
            onClick={() => pay.mutate(due.data!.amountDueMinor)}
          >
            {pay.isPending ? 'Paying…' : `Pay ${formatBDT(due.data.amountDueMinor)}`}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * An ended rental in the driver's "Past rentals" list: the car it was, plus the
 * surface to rate the vehicle and its Fleet Owner. Each rating is offered only
 * until it has been submitted (looked up via the agreement's reviews).
 */
function EndedAgreementCard({ agreement }: { agreement: RentalAgreement }) {
  const myId = useAuthStore((s) => s.session?.userId);
  const reviews = useRentalReviews(agreement.id);
  const { vehicle } = agreement;

  const mine = (reviews.data ?? []).filter((r) => r.reviewerId === myId);
  const ratedVehicle = mine.some((r) => r.revieweeType === ReviewTargetType.Vehicle);
  const ratedOwner = mine.some((r) => r.revieweeType === ReviewTargetType.Owner);

  return (
    <div className="border-bottom py-3">
      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
        <div className="d-flex gap-2">
          {vehicle?.photoUrl
            ? <img src={vehicle.photoUrl} alt={vehicle.plateNumber} className="rounded border" style={{ width: 56, height: 42, objectFit: 'cover' }} />
            : <span className="d-inline-flex align-items-center justify-content-center rounded border bg-light text-muted" style={{ width: 56, height: 42, fontSize: 11 }}>No photo</span>}
          <div>
            <div className="fw-medium">
              {vehicle ? `${vehicle.make ?? vehicle.type} ${vehicle.model ?? ''} · ${vehicle.plateNumber}` : `Agreement ${agreement.id.slice(0, 8)}`}
            </div>
            {agreement.endDate && (
              <div className="text-muted small">Ended {new Date(agreement.endDate).toLocaleDateString()}</div>
            )}
          </div>
        </div>
        <Badge bg="secondary">Ended</Badge>
      </div>

      {reviews.isLoading ? (
        <Spinner animation="border" size="sm" variant="success" />
      ) : ratedVehicle && ratedOwner ? (
        <div className="text-success small">★ You’ve rated this rental. Thanks!</div>
      ) : (
        <Row className="g-3">
          {!ratedVehicle && (
            <Col xs={12} md={!ratedOwner ? 6 : 12}>
              <RatingCard
                rentalAgreementId={agreement.id}
                revieweeType={ReviewTargetType.Vehicle}
                title="Rate the vehicle"
                prompt="How was the car?"
                tags={VEHICLE_TAGS}
                successText="Thanks — your feedback helps other rental drivers."
                className="border h-100"
              />
            </Col>
          )}
          {!ratedOwner && (
            <Col xs={12} md={!ratedVehicle ? 6 : 12}>
              <RatingCard
                rentalAgreementId={agreement.id}
                revieweeType={ReviewTargetType.Owner}
                title="Rate the Fleet Owner"
                prompt="How was renting from them?"
                tags={OWNER_TAGS}
                successText="Thanks — your feedback helps other rental drivers."
                className="border h-100"
              />
            </Col>
          )}
        </Row>
      )}
    </div>
  );
}
