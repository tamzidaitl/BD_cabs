import { Button, Navbar } from 'react-bootstrap';
import { Menu } from 'lucide-react';
import { UserMenu } from '../UserMenu';

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return (
    <Navbar
      bg="white"
      className="border-bottom px-3 sticky-top"
      style={{ height: 'var(--topbar-height)' }}
    >
      <Button
        variant="light"
        className="d-lg-none me-2"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation"
      >
        <Menu size={20} />
      </Button>

      <div className="ms-auto">
        <UserMenu />
      </div>
    </Navbar>
  );
}
