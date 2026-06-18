import { Link } from 'react-router-dom';
import { PUBLIC_NAV, SUPPORT_EMAIL } from './site';

/** Footer for the public marketing site, with quick links and support email. */
export function PublicFooter() {
  return (
    <footer className="text-white mt-auto" style={{ background: '#0f1f1a' }}>
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-12 col-md-6">
            <div className="fs-5 fw-semibold mb-2">🚕 BD Cabs</div>
            <p className="opacity-75 mb-0" style={{ maxWidth: 360 }}>
              Reliable rides across Bangladesh — safe drivers, fair fares, and round-the-clock
              support.
            </p>
          </div>
          <div className="col-6 col-md-3">
            <div className="text-uppercase small fw-semibold opacity-75 mb-2">Company</div>
            <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
              {PUBLIC_NAV.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="link-light text-decoration-none opacity-75">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-6 col-md-3">
            <div className="text-uppercase small fw-semibold opacity-75 mb-2">Get in touch</div>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="link-light text-decoration-none opacity-75"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
        <hr className="border-light opacity-25 my-4" />
        <div className="small opacity-50">© 2026 BD Cabs. All rights reserved.</div>
      </div>
    </footer>
  );
}
