/** Profile avatar: the user's photo when set, otherwise their initials in a circle. */
export function Avatar({
  user,
  size = 36,
}: {
  user?: { fullName?: string; avatarUrl?: string | null } | null;
  size?: number;
}) {
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.fullName ?? 'Profile'}
        className="rounded-circle object-fit-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success text-white fw-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials(user?.fullName)}
    </span>
  );
}

function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}
