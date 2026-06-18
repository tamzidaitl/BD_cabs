import { Mail, LifeBuoy, CreditCard, Car } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/components/public/site';

const TOPICS = [
  {
    icon: Car,
    title: 'Bookings & rides',
    body: 'Questions about a current or past trip, driver details, or trip receipts.',
  },
  {
    icon: CreditCard,
    title: 'Payments & refunds',
    body: 'Help with fares, charges, coupons, and refund requests.',
  },
  {
    icon: LifeBuoy,
    title: 'Account & safety',
    body: 'Account access, lost items, and reporting a safety concern.',
  },
];

/** Support page — help topics and how to reach the support team. */
export default function Support() {
  return (
    <>
      <section
        className="text-white"
        style={{ background: 'linear-gradient(135deg, #0b8457 0%, #0f1f1a 100%)' }}
      >
        <div className="container py-5">
          <h1 className="display-6 fw-bold mb-2">Support</h1>
          <p className="fs-5 opacity-75 mb-0" style={{ maxWidth: 640 }}>
            We&apos;re here 24/7. Browse common topics below or email our team directly.
          </p>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <div className="row g-4 mb-4">
            {TOPICS.map((t) => {
              const Icon = t.icon;
              return (
                <div className="col-12 col-md-4" key={t.title}>
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <span
                        className="d-inline-flex align-items-center justify-content-center rounded-3 bg-success-subtle text-success mb-3"
                        style={{ width: 48, height: 48 }}
                      >
                        <Icon size={24} />
                      </span>
                      <h3 className="h6 fw-semibold">{t.title}</h3>
                      <p className="text-muted small mb-0">{t.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body p-4 p-md-5 text-center">
              <Mail size={32} className="text-success mb-3" />
              <h2 className="h4 fw-bold mb-2">Still need help?</h2>
              <p className="text-muted mb-3">
                Email our support team and we&apos;ll get back to you as soon as possible.
              </p>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-success btn-lg">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
