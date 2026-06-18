const VALUES = [
  {
    title: 'Safety first',
    body: 'Verified drivers, tracked rides, and an incident team that responds around the clock.',
  },
  {
    title: 'Fair for everyone',
    body: 'Transparent fares for riders and timely, honest payouts for our driver partners.',
  },
  {
    title: 'Always reliable',
    body: 'A ride when you need one — day or night, in cities across the country.',
  },
];

/** About Us page — the company story and values. */
export default function About() {
  return (
    <>
      <section
        className="text-white"
        style={{ background: 'linear-gradient(135deg, #0b8457 0%, #0f1f1a 100%)' }}
      >
        <div className="container py-5">
          <h1 className="display-6 fw-bold mb-2">About BD Cabs</h1>
          <p className="fs-5 opacity-75 mb-0" style={{ maxWidth: 640 }}>
            We&apos;re on a mission to make everyday travel across Bangladesh safe, affordable, and
            dependable — for riders and drivers alike.
          </p>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <div className="row g-4 align-items-start">
            <div className="col-12 col-lg-6">
              <h2 className="h3 fw-bold mb-3">Our story</h2>
              <p className="text-muted">
                BD Cabs began with a simple idea: getting around shouldn&apos;t be stressful. We set
                out to build a ride-hailing service that riders can trust and that treats its driver
                partners fairly.
              </p>
              <p className="text-muted mb-0">
                Today we connect thousands of riders with verified drivers every day, backed by
                transparent pricing, careful verification, and a support team that&apos;s always
                ready to help.
              </p>
            </div>
            <div className="col-12 col-lg-6">
              <div className="row g-3">
                {VALUES.map((v) => (
                  <div className="col-12" key={v.title}>
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body">
                        <h3 className="h6 fw-semibold">{v.title}</h3>
                        <p className="text-muted small mb-0">{v.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
