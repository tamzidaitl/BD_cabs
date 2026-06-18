import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, Wallet, MapPin } from 'lucide-react';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Verified drivers',
    body: 'Every driver and vehicle is vetted and verified before they can accept a ride.',
  },
  {
    icon: Wallet,
    title: 'Transparent fares',
    body: 'Upfront pricing with no hidden charges — see the fare before you book.',
  },
  {
    icon: Clock,
    title: '24/7 availability',
    body: 'Rides around the clock, with support standing by whenever you need help.',
  },
  {
    icon: MapPin,
    title: 'Nationwide coverage',
    body: 'From Dhaka to Chittagong and beyond — BD Cabs reaches cities across the country.',
  },
];

/** Public home page served at the root path "/". */
export default function Home() {
  return (
    <>
      {/* Hero */}
      <section
        className="text-white"
        style={{ background: 'linear-gradient(135deg, #0b8457 0%, #0f1f1a 100%)' }}
      >
        <div className="container py-5">
          <div className="row align-items-center g-4 py-lg-4">
            <div className="col-12 col-lg-7">
              <h1 className="display-5 fw-bold mb-3">Your ride, anywhere in Bangladesh.</h1>
              <p className="fs-5 opacity-75 mb-4" style={{ maxWidth: 560 }}>
                BD Cabs connects you with verified drivers and fair fares — safe, fast, and
                available around the clock.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Link to="/signup" className="btn btn-light btn-lg">
                  Sign up
                </Link>
                <Link to="/about" className="btn btn-outline-light btn-lg">
                  Learn more
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="h3 fw-bold">Why ride with BD Cabs</h2>
            <p className="text-muted mb-0">Built for safe, simple, and dependable travel.</p>
          </div>
          <div className="row g-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div className="col-12 col-sm-6 col-lg-3" key={f.title}>
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <span
                        className="d-inline-flex align-items-center justify-content-center rounded-3 bg-success-subtle text-success mb-3"
                        style={{ width: 48, height: 48 }}
                      >
                        <Icon size={24} />
                      </span>
                      <h3 className="h6 fw-semibold">{f.title}</h3>
                      <p className="text-muted small mb-0">{f.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4 p-md-5 text-center">
              <h2 className="h4 fw-bold mb-2">Need a hand?</h2>
              <p className="text-muted mb-4">
                Our support team is available 24/7 to help with bookings, payments, and more.
              </p>
              <Link to="/contact" className="btn btn-success btn-lg">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
