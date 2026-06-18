# BD Cabs — Roles & Responsibilities

## Account Creation & Activation

- **Self-signup** is open to Customer, Driver, Fleet/Vehicle Owner, and Corporate Client. No Super Admin needed to register.
- **Super Admin** is seeded once during system setup (not created in-app).
- **Super Admin** creates **Support Admin** and **Finance Admin** (internal staff accounts).
- Activation is **not** automatic for every role — see the verification gate below.

| Role | How account is created | Active immediately? |
|---|---|---|
| Customer / Passenger | Self-signup | Yes |
| Driver | Self-signup | No — Pending until documents verified |
| Fleet / Vehicle Owner | Self-signup | No — verified before listing vehicles |
| Corporate Client | Self-signup | No — billing/credit agreement approved first |
| Support Admin | Created by Super Admin | Yes |
| Finance Admin | Created by Super Admin | Yes |
| Super Admin | Seeded at system setup | Yes |

---

## 1. Customer / Passenger

- [x] Search for nearby vehicles
- [x] Book rides instantly or in advance
- [x] Schedule recurring rides
- [x] Track driver location in real time
- [x] Pay for rides (apply coupon for discount if available)
- [x] Manage payment methods / wallet
- [x] Cancel a ride (subject to cancellation policy / fee)
- [x] SOS / emergency button + share trip with contacts
- [x] Save favorite locations (home / work)
- [x] View ride history
- [x] Rate drivers
- [x] Raise a complaint / dispute a fare

## 2. Driver

- [x] Accept / reject ride requests
- [x] Navigate to pickup location
- [x] Start and complete trips
- [x] Manage availability (Online / Offline)
- [x] View earnings and withdraw payouts
- [x] Receive ratings; give ratings to Customer and to Vehicle Owner
- [x] Upload and renew personal documents (license, NID, etc.)

**Rental relationship (rental drivers only):**
- [x] Rent a car from a Vehicle Owner (subject to Owner's approval and rental terms)
- [x] View assigned / rented vehicle details
- [x] Pay rent to the Vehicle Owner

> Note: A driver is either an **owner-driver** (drives their own/the platform's car) or a **rental driver** (rents from a Vehicle Owner). The rental actions above apply only to rental drivers.

## 3. Fleet Owner / Vehicle Owner

- Register vehicles (subject to verification)
- Add / remove drivers to the fleet
- Approve which driver can rent / drive which vehicle
- Set rental terms and rental price to drivers
- Receive rent payments from drivers
- Monitor vehicle performance
- Track vehicle
- Upload vehicle Picture and Documents for verify
- View revenue reports
- Manage documents (vehicle papers, insurance, fitness — track expiry)
- Activate / deactivate a vehicle
- Give and receive ratings/reviews with Drivers and Corporate Clients

## 4. Corporate Client

- Book transportation for employees
- Manage employee list (who can book under the company)
- Set per-employee spending limits / approval rules
- Schedule recurring rides
- Manage company billing
- View consolidated trip and spend reports
- Rate and review Fleet / Vehicle Owners

> Note: Ride allocation policy must be decided — either the platform auto-allocates an available vehicle, or the corporate selects a specific fleet.

## 5. Support Admin (Operations)

- Driver onboarding
- Vehicle verification
- Ride monitoring
- Fraud detection
- Incident management
- Create bookings manually
- Handle customer complaints
- Monitor active trips
- Resolve emergencies

## 6. Finance Admin (Money)

> Split out from Support Admin for **separation of duties** — the person who verifies a driver must not also approve that driver's payout.

- Driver payouts
- Corporate invoicing
- Refunds
- Commission calculations
- Financial reporting

## 7. Super Admin

- Manage all users (including creating Support Admin & Finance Admin)
- Configure pricing
- Configure the **fare-split / commission model** (see below)
- Create coupons
- Manage cities / zones
- View analytics
- Manage permissions
- System configuration

---

## Coupon System

**Owned by Super Admin** (created/configured). Customers apply coupons at booking/payment. Finance Admin reconciles who absorbs the discount.

### Coupon types
- **Percentage discount** — e.g. 20% off, with an optional max-discount cap (e.g. 20% up to ৳100).
- **Flat discount** — e.g. ৳50 off the fare.
- **Free / capped ride** — full or partial fare waived up to a limit.
- **First-ride** — auto-applied or code-based for a customer's first booking.
- **Referral** — issued to referrer and/or referee after a qualifying ride.

### Coupon attributes (data model)
| Field | Purpose |
|---|---|
| `code` | Unique, case-insensitive code the customer enters |
| `type` | percentage / flat / free-ride |
| `value` | Percent or amount |
| `max_discount` | Cap on the discount amount (for percentage type) |
| `min_fare` | Minimum ride fare required to apply |
| `valid_from` / `valid_to` | Active date window |
| `usage_limit_total` | Max total redemptions across all users |
| `usage_limit_per_user` | Max redemptions per customer |
| `applicable_cities` / `zones` | Geo restriction (ties to Manage cities/zones) |
| `applicable_roles` | Default Customer; optionally Corporate |
| `cost_borne_by` | platform / owner — who absorbs the discount |
| `status` | active / paused / expired |
| `first_ride_only` | Restrict to a customer's first booking |

### Validation rules (checked at apply time)
1. Code exists, is `active`, and within the `valid_from`–`valid_to` window.
2. Ride fare ≥ `min_fare`.
3. Pickup city/zone is in `applicable_cities` / `zones`.
4. Customer has not exceeded `usage_limit_per_user`.
5. Total redemptions have not exceeded `usage_limit_total`.
6. `first_ride_only` coupons reject if the customer has prior completed rides.
7. Only **one coupon per ride** (no stacking) unless explicitly allowed.

### Lifecycle
- **Create / pause / expire** → Super Admin.
- **Apply** → Customer (at booking or payment).
- **Redemption recorded** → on ride completion, lock the coupon usage against that customer + ride.
- **Refund/cancel** → if a ride is cancelled, the redemption is released (returns to the user's quota); on refund, Finance Admin reverses the discount accounting per `cost_borne_by`.

### Cost accounting
The discount amount is logged against `cost_borne_by`:
- **platform** → reduces platform commission / is a marketing expense.
- **owner** → reduces the Vehicle Owner's cut (only if owner-sponsored promos are allowed).

This connects directly to the **Coupon cost** line in Money Flow below.

---

## Money Flow (to be finalized)

A single ride fare must be split explicitly across parties. Define the rules for:

1. **Customer payment** → ride fare, minus any coupon discount.
2. **Platform commission** → percentage/flat fee the platform keeps per ride.
3. **Vehicle Owner cut** → owner's share of the fare (for fleet vehicles).
4. **Driver earnings** → driver's share after commission and owner cut.
5. **Coupon cost** → who absorbs the discount (platform vs owner).
6. **Driver → Owner rent** → separate recurring flow, independent of per-ride fare.
7. **Corporate invoicing** → billed periodically, not per-ride at point of use.

> Open question: For each completed ride, who receives what slice of the fare? This split is the core of the business model and must be defined before implementation.
