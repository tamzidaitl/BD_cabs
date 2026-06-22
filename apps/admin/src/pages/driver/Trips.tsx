import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Modal, Spinner } from 'react-bootstrap';
import { Star } from 'lucide-react';
import {
  PaymentStatus,
  queryKeys,
  ReviewTargetType,
  RideStatus,
  useAuthStore,
  useRideReviews,
  useServices,
  type Ride,
} from '@bd-cabs/core';
import { formatBDT, formatDistance } from '@/lib/appNav';
import { Avatar } from '@/components/Avatar';
import { RatingCard } from '@/components/RatingCard';
import { rideStatusVariant } from '../customer/rideStatus';

const PASSENGER_TAGS = ['Polite', 'On time', 'Easy pickup', 'Respectful', 'Good communication', 'Clean'];
const OWNER_TAGS = ['Fair terms', 'Well-maintained car', 'Responsive', 'Easy handover', 'Clean car'];

const TRIPS_PAGE_SIZE = 20;

/** A driver's trip history, with the ability to rate the passenger (and, for
 * rental trips, the vehicle owner) on each completed trip. Trips are loaded 20
 * at a time and the next page is fetched as the driver scrolls to the bottom. */
export default function TripsPage() {
  const { endpoints } = useServices();
  const trips = useInfiniteQuery({
    queryKey: ['drivers', 'trips', { pageSize: TRIPS_PAGE_SIZE }],
    queryFn: ({ pageParam }) =>
      endpoints.drivers.trips({ page: pageParam, pageSize: TRIPS_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.pageSize;
      return loaded < lastPage.totalCount ? lastPage.page + 1 : undefined;
    },
  });

  const items = useMemo(
    () => (trips.data?.pages ?? []).flatMap((p) => p.items),
    [trips.data],
  );

  // Rental agreements let us tell which trips were driven on a rented car — only
  // those have a separate owner the driver can rate.
  const rentals = useQuery({
    queryKey: queryKeys.rentals.mine(),
    queryFn: () => endpoints.rentals.mine(),
  });
  const rentedVehicleIds = useMemo(
    () => new Set((rentals.data ?? []).map((a) => a.vehicleId)),
    [rentals.data],
  );

  // Sentinel watched by an IntersectionObserver — when it scrolls into view we
  // request the next page (if there is one and we're not already fetching).
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = trips;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <>
      <h1 className="h4 mb-3">Trips</h1>
      {trips.isLoading && <div className="text-center py-5"><Spinner animation="border" variant="success" /></div>}
      {!trips.isLoading && items.length === 0 && (
        <Card className="border-0 shadow-sm"><Card.Body className="text-center text-muted py-5">No trips yet.</Card.Body></Card>
      )}
      {items.length > 0 && (
        <Card className="border-0 shadow-sm">
          <div className="list-group list-group-flush">
            {items.map((r) => (
              <TripRow key={r.id} ride={r} canRateOwner={!!r.vehicleId && rentedVehicleIds.has(r.vehicleId)} />
            ))}
          </div>
          {hasNextPage && (
            <div ref={sentinelRef} className="text-center py-3">
              {isFetchingNextPage && <Spinner animation="border" size="sm" variant="success" />}
            </div>
          )}
        </Card>
      )}
    </>
  );
}

function TripRow({ ride, canRateOwner }: { ride: Ride; canRateOwner: boolean }) {
  const [showRating, setShowRating] = useState(false);
  const isCompleted = ride.status === RideStatus.Completed;
  const alreadyRated = ride.driverRating != null;

  return (
    <div className="list-group-item">
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex gap-3 align-items-center">
          <Avatar user={ride.customer} size={40} />
          <div>
            <div className="fw-semibold">{ride.customer?.fullName ?? 'Passenger'}</div>
            <div className="fw-medium">{ride.pickup.address} → {ride.destination.address}</div>
            <div className="text-muted small">{new Date(ride.requestedAt).toLocaleString()} · {formatDistance(ride.distanceMeters)}</div>
          </div>
        </div>
        <div className="text-end">
          <Badge bg={rideStatusVariant(ride.status)}>{ride.status}</Badge>
          <div className="small text-muted mt-1">{formatBDT(ride.finalFareMinor ?? ride.fareEstimateMinor)}</div>
          {ride.paymentStatus === PaymentStatus.Paid ? (
            <div><Badge bg="success-subtle" text="success" className="mt-1">Paid</Badge></div>
          ) : isCompleted ? (
            <div><Badge bg="warning" text="dark" className="mt-1">Unpaid</Badge></div>
          ) : null}
          {isCompleted && ride.driverRating != null && (
            <div
              className="small text-warning mt-1 d-flex align-items-center justify-content-end gap-1"
              aria-label={`You rated this trip ${ride.driverRating} out of 5`}
            >
              <Star size={14} fill="currentColor" strokeWidth={0} />
              {ride.driverRating.toFixed(1)} <span className="text-muted">· Rated by you</span>
            </div>
          )}
          {isCompleted && (
            <Button
              variant={alreadyRated ? 'outline-success' : 'success'}
              size="sm"
              className="mt-2 d-inline-flex align-items-center gap-1"
              onClick={() => setShowRating(true)}
            >
              <Star size={14} /> {alreadyRated ? 'View / rate' : 'Rate trip'}
            </Button>
          )}
        </div>
      </div>

      <Modal show={showRating} onHide={() => setShowRating(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5">Rate trip</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div className="d-flex align-items-center gap-3 px-3 py-3 border-bottom">
            <Avatar user={ride.customer} size={44} />
            <div className="lh-sm">
              <div className="fw-semibold">{ride.customer?.fullName ?? 'Passenger'}</div>
              <div className="text-muted small">
                {new Date(ride.requestedAt).toLocaleDateString()} · {formatDistance(ride.distanceMeters)}
              </div>
              <div className="text-muted small">
                {ride.pickup.address} → {ride.destination.address}
              </div>
            </div>
          </div>
          {showRating && <TripRatingPanel ride={ride} canRateOwner={canRateOwner} />}
        </Modal.Body>
      </Modal>
    </div>
  );
}

/**
 * The driver's rating surface for one completed trip: rate the passenger, and —
 * on rented vehicles — the owner too. Existing reviews are looked up so each
 * direction is offered only until it has been submitted.
 */
function TripRatingPanel({ ride, canRateOwner }: { ride: Ride; canRateOwner: boolean }) {
  const myId = useAuthStore((s) => s.session?.userId);
  const reviews = useRideReviews(ride.id);

  if (reviews.isLoading) {
    return <div className="text-center py-5"><Spinner animation="border" size="sm" variant="success" /></div>;
  }

  const mine = (reviews.data ?? []).filter((r) => r.reviewerId === myId);
  const ratedCustomer = mine.some((r) => r.revieweeType === ReviewTargetType.Customer);
  const ratedOwner = mine.some((r) => r.revieweeType === ReviewTargetType.Owner);

  const showCustomer = !ratedCustomer;
  const showOwner = canRateOwner && !ratedOwner;

  if (!showCustomer && !showOwner) {
    return (
      <div className="text-center text-success py-5 px-3">
        <Star size={40} fill="currentColor" strokeWidth={0} className="mb-2" />
        <div className="fw-medium">You’ve rated this trip. Thanks!</div>
      </div>
    );
  }

  return (
    <>
      {showCustomer && (
        <RatingCard
          rideId={ride.id}
          revieweeType={ReviewTargetType.Customer}
          title="Rate your passenger"
          prompt="How was your rider?"
          tags={PASSENGER_TAGS}
          className="border-0"
        />
      )}
      {showCustomer && showOwner && <hr className="m-0" />}
      {showOwner && (
        <RatingCard
          rideId={ride.id}
          revieweeType={ReviewTargetType.Owner}
          title="Rate the vehicle owner"
          prompt="How was renting this car?"
          tags={OWNER_TAGS}
          successText="Thanks — your feedback helps other rental drivers."
          className="border-0"
        />
      )}
    </>
  );
}
