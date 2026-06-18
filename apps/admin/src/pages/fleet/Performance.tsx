import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Spinner, Table } from 'react-bootstrap';
import { queryKeys, useServices } from '@bd-cabs/core';
import { formatBDT } from '@/lib/appNav';

/**
 * Per-vehicle performance and live tracking. Shows completed trips, gross fares,
 * and owner earnings per vehicle, plus the currently-assigned driver and their
 * last known GPS position. (Capabilities: monitor vehicle performance, track
 * vehicle.) Polls so the tracking column stays fresh.
 */
export default function FleetPerformancePage() {
  const { endpoints } = useServices();
  const perf = useQuery({
    queryKey: queryKeys.fleet.performance(),
    queryFn: () => endpoints.fleet.performance(),
    refetchInterval: 20_000,
  });

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <h1 className="h5 mb-3">Vehicle performance &amp; tracking</h1>
        {perf.isLoading && <Spinner animation="border" size="sm" variant="success" />}
        {perf.data && perf.data.length === 0 && <p className="text-muted mb-0">No vehicles to report on yet.</p>}
        {perf.data && perf.data.length > 0 && (
          <Table responsive className="align-middle mb-0">
            <thead>
              <tr className="text-muted small">
                <th>Vehicle</th>
                <th>Status</th>
                <th className="text-end">Trips</th>
                <th className="text-end">Gross fares</th>
                <th className="text-end">Owner earnings</th>
                <th>Tracking</th>
              </tr>
            </thead>
            <tbody>
              {perf.data.map((v) => (
                <tr key={v.vehicleId}>
                  <td className="fw-medium">{v.plateNumber}</td>
                  <td>
                    <Badge bg={v.status === 'active' ? 'success' : v.status === 'maintenance' ? 'warning' : 'secondary'} text={v.status === 'maintenance' ? 'dark' : undefined}>
                      {v.status}
                    </Badge>
                  </td>
                  <td className="text-end">{v.completedTrips}</td>
                  <td className="text-end">{formatBDT(v.grossFareMinor)}</td>
                  <td className="text-end fw-medium">{formatBDT(v.ownerEarningsMinor)}</td>
                  <td className="small">
                    {v.currentLat != null && v.currentLng != null ? (
                      <>
                        <span className="text-success">●</span> {v.currentLat.toFixed(4)}, {v.currentLng.toFixed(4)}
                        {v.locationUpdatedAt && (
                          <div className="text-muted">{new Date(v.locationUpdatedAt).toLocaleTimeString()}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-muted">No live location</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}
