import { Mail, Clock, MapPin } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/components/public/site';

const CHANNELS = [
  {
    icon: Mail,
    title: 'Email',
    render: () => (
      <a href={`mailto:${SUPPORT_EMAIL}`} className="text-decoration-none link-success">
        {SUPPORT_EMAIL}
      </a>
    ),
  },
  {
    icon: Clock,
    title: 'Hours',
    render: () => (
      <p className="text-muted small mb-0">Support available 24 hours a day, 7 days a week.</p>
    ),
  },
  {
    icon: MapPin,
    title: 'Coverage',
    render: () => <p className="text-muted small mb-0">Serving cities across Bangladesh.</p>,
  },
];

/** Contact Us page — how to reach BD Cabs. */
export default function Contact() {
  return (
    <>
      <section
        className="text-white"
        style={{ background: 'linear-gradient(135deg, #0b8457 0%, #0f1f1a 100%)' }}
      >
        <div className="container py-5">
          <h1 className="display-6 fw-bold mb-2">Contact Us</h1>
          <p className="fs-5 opacity-75 mb-0" style={{ maxWidth: 640 }}>
            Have a question or feedback? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <div className="row g-4">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              return (
                <div className="col-12 col-md-4" key={c.title}>
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <span
                        className="d-inline-flex align-items-center justify-content-center rounded-3 bg-success-subtle text-success mb-3"
                        style={{ width: 48, height: 48 }}
                      >
                        <Icon size={24} />
                      </span>
                      <h3 className="h6 fw-semibold">{c.title}</h3>
                      {c.render()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card border-0 shadow-sm mt-4">
            <div className="card-body p-4 p-md-5 text-center">
              <h2 className="h4 fw-bold mb-2">Reach our team</h2>
              <p className="text-muted mb-3">
                For the fastest response, email us and we&apos;ll get back to you shortly.
              </p>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-success btn-lg">
                Email {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
