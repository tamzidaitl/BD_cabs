# BD_Cabs — User Stories

> Format: **As a** `<role>`, **I want** `<goal>`, **so that** `<benefit>`.
> Each story includes **Acceptance Criteria (AC)** in Given/When/Then form.
> Roles covered: **Customer/Passenger**, **Driver**, **Fleet/Vehicle Owner**, **Corporate Client**, **Support Admin**, **Finance Admin**, **Super Admin**, **Guest**.
> Canonical role definitions live in [`role_wise_story.md`](role_wise_story.md).

---

## Roles Overview

| Role | Who they are | Account creation |
|---|---|---|
| **Customer / Passenger** | End customer who books and takes rides | Self-signup, active immediately |
| **Driver** | Person who accepts and fulfills ride requests; may rent a car from a Vehicle Owner | Self-signup, pending until documents verified |
| **Fleet / Vehicle Owner** | Company/individual that owns vehicles, rents them to drivers, and manages a fleet | Self-signup, verified before listing vehicles |
| **Corporate Client** | Company that books transportation for its employees and is billed periodically | Self-signup, billing/credit agreement approved first |
| **Support Admin** | Operations staff: onboarding, verification, ride monitoring, fraud, incidents, complaints | Created by Super Admin |
| **Finance Admin** | Finance staff: payouts, invoicing, refunds, commissions, financial reporting | Created by Super Admin |
| **Super Admin** | Full system configuration, pricing, coupons, zones, permissions, RBAC, audit | Seeded at system setup |
| **Guest** | Unregistered visitor browsing the app/site | n/a |

> **Separation of duties:** Support Admin (operations) and Finance Admin (money) are deliberately split — the person who verifies a driver must not also approve that driver's payout.

---

# 1. Customer / Passenger

### R-1 — Sign up & login
**As a** customer, **I want** to register and log in with my phone or email, **so that** I can access the app securely.
- **AC1 (Given/When/Then):** Given I'm a new user, when I submit valid details and verify OTP, then my account is created and I'm logged in.
- **AC2:** Given a wrong OTP, when I submit it, then I see an error and can resend after a cooldown.

### R-2 — Set pickup & destination
**As a** rider, **I want** to enter pickup and drop-off locations with map and autocomplete, **so that** I can request a ride accurately.
- **AC1:** Given I type an address, when results load, then I can pick from autocomplete suggestions.
- **AC2:** Given I drag the map pin, then the pickup updates to the new coordinates.

### R-3 — See fare estimate before booking
**As a** rider, **I want** to see the fare estimate and ETA before confirming, **so that** I know the cost upfront.
- **AC1:** Given a valid route, when I request an estimate, then I see fare range, distance, ETA, and vehicle options.
- **AC2:** Given surge pricing is active, then the estimate clearly shows a surge multiplier.

### R-4 — Book a ride
**As a** rider, **I want** to request a ride and get matched to a nearby driver, **so that** I can travel.
- **AC1:** Given I confirm a request, when a driver accepts, then I see driver name, photo, vehicle, plate, and live ETA.
- **AC2:** Given no driver is found within the timeout, then I'm notified and offered to retry.

### R-5 — Track ride in real time
**As a** rider, **I want** to track the driver live on the map, **so that** I know when they'll arrive.
- **AC1:** Given a driver is assigned, then the driver's marker updates in real time via SignalR.

### R-6 — Verify ride with OTP
**As a** rider, **I want** to share a start OTP with the driver, **so that** only my assigned driver starts my trip.
- **AC1:** Given the driver enters the correct OTP, then the trip starts; otherwise it cannot start.

### R-7 — Pay with multiple methods
**As a** rider, **I want** to pay by cash, card, bKash/Nagad, or wallet, **so that** I can choose what's convenient.
- **AC1:** Given a completed trip, when payment is processed, then I receive a fare breakdown and receipt.

### R-8 — Apply coupons / promo codes
**As a** customer, **I want** to apply a coupon code, **so that** I get a discount.
- **AC1:** Given a valid, eligible coupon (active, within validity, fare ≥ `min_fare`, in an allowed city/zone, within per-user and total usage limits), when applied, then the discount (capped by `max_discount`) reflects in the final fare.
- **AC2:** Given an expired/invalid/over-limit coupon, then I see a clear rejection message.
- **AC3:** Given a `first_ride_only` coupon and I have prior completed rides, then it is rejected.
- **AC4:** Given I already applied one coupon, then I cannot stack a second on the same ride.

> Coupon rules, types, and `cost_borne_by` accounting are defined in [`role_wise_story.md`](role_wise_story.md) → Coupon System.

### R-9 — Rate and review
**As a** rider, **I want** to rate and review my driver after a ride, **so that** I can give feedback.
- **AC1:** Given a completed ride, when I submit a 1–5 rating with optional comment/tags, then it's recorded.
- **AC2:** Given I haven't rated, then I'm prompted on next app open.

### R-10 — Manage saved places
**As a** rider, **I want** to save Home, Work, and favorite places, **so that** I can book faster.

### R-11 — View ride history & receipts
**As a** rider, **I want** to view past rides and download receipts, **so that** I can track spending.

### R-12 — Cancel a ride
**As a** rider, **I want** to cancel a ride with a reason, **so that** I'm not stuck if plans change.
- **AC1:** Given I cancel after the grace period, then a cancellation fee may apply and is shown beforehand.

### R-13 — Safety: SOS & share trip
**As a** rider, **I want** an SOS button and live trip sharing, **so that** I feel safe.
- **AC1:** Given I tap SOS, then emergency contacts/authorities are alerted with my live location.

### R-14 — Notifications
**As a** customer, **I want** push notifications for ride status and promos, **so that** I stay informed.

### R-15 — Schedule recurring rides
**As a** customer, **I want** to schedule recurring rides (e.g. a daily commute), **so that** routine trips are booked automatically.
- **AC1:** Given a recurrence rule, then rides are auto-created per schedule until I cancel it.

### R-16 — Raise a complaint / dispute a fare
**As a** customer, **I want** to raise a complaint or dispute a fare on a completed ride, **so that** errors are corrected.
- **AC1:** Given I dispute a fare, then a ticket is created and Support Admin reviews it.

---

# 2. Driver

### D-1 — Onboard & verify (KYC)
**As a** driver, **I want** to submit my license, NID, and documents, **so that** I can be approved to drive.
- **AC1:** Given I upload required docs, when I submit, then my status becomes `Pending Review`.
- **AC2:** Given admin approves, then I'm notified and can go online.

### D-2 — Go online/offline
**As a** driver, **I want** to toggle my availability, **so that** I only get requests when I'm working.
- **AC1:** Given I'm offline, then I receive no ride requests.

### D-3 — Receive nearby requests
**As a** driver, **I want** to receive ride requests near me with pickup, distance, and estimated fare, **so that** I can decide to accept.
- **AC1:** Given a new request, when it arrives via SignalR, then I see details and an accept/decline countdown.

### D-4 — Accept / decline rides
**As a** driver, **I want** to accept or decline a request, **so that** I control my workload.
- **AC1:** Given I accept, then the rider is notified and the request is removed from other drivers.

### D-5 — Navigate the trip lifecycle
**As a** driver, **I want** to mark Arrived → Start (OTP) → Complete, **so that** the ride progresses correctly.
- **AC1:** Given I tap Complete, then the fare is calculated and payment is triggered.

### D-6 — Get turn-by-turn navigation
**As a** driver, **I want** map navigation to pickup and destination, **so that** I can drive efficiently.

### D-7 — View earnings
**As a** driver, **I want** daily/weekly/total earnings and trip breakdowns, **so that** I can track income.
- **AC1:** Given completed rides, then earnings show fare, commission, and net.

### D-8 — Request payout
**As a** driver, **I want** to withdraw my balance to bank/mobile money, **so that** I receive my money.
- **AC1:** Given sufficient balance, when I request a payout, then it enters the settlement queue.

### D-9 — Rate the rider
**As a** driver, **I want** to rate riders, **so that** the community stays accountable.

### D-10 — Manage vehicle
**As a** driver, **I want** to register and select my active vehicle, **so that** the right car is shown to riders.
- **Note:** If the car belongs to a **Fleet Owner**, the vehicle is assigned to me rather than self-registered.

### D-11 — View ratings & feedback
**As a** driver, **I want** to see my aggregate rating and feedback, **so that** I can improve.

### D-12 — Cancel with reason
**As a** driver, **I want** to cancel when necessary (rider no-show), **so that** I'm not penalized unfairly.

### D-13 — Rent a car from a Vehicle Owner *(rental drivers only)*
**As a** driver without my own car, **I want** to request and rent a vehicle from a Fleet/Vehicle Owner, **so that** I can earn by driving their car.
- **AC1:** Given I request a vehicle, when the Owner approves and sets rental terms, then the vehicle is assigned to me and I can go online with it.
- **AC2:** Given no Owner approval, then I cannot go online with that vehicle.

### D-14 — Pay rent to the Vehicle Owner
**As a** rental driver, **I want** to pay my rent (fixed or revenue-share) to the Owner, **so that** I keep my vehicle assignment in good standing.
- **AC1:** Given a configured rental term, when the rent is due, then I see the amount owed and can pay it (or it is deducted per the revenue-share split).
- **AC2:** Given rent is overdue, then I'm notified and the Owner may suspend the assignment.

### D-15 — Rate the Vehicle Owner
**As a** rental driver, **I want** to rate and review the Vehicle Owner, **so that** other drivers know what to expect.

> **Note:** Stories D-13 to D-15 apply only to **rental drivers**. An **owner-driver** (drives their own car or a platform car) skips these.

---

# 3. Fleet Owner / Vehicle Owner (Car Rental Partner / Company)

> A company or individual who **owns cars** and **rents them to drivers**, earning a share of ride revenue while managing their fleet and drivers.

### F-1 — Register as a fleet partner
**As a** fleet owner, **I want** to register my company and submit business documents, **so that** I can operate on the platform.
- **AC1:** Given I submit company KYC (trade license, NID, bank details), then my account goes to `Pending Verification`.

### F-2 — Add & manage vehicles
**As a** fleet owner, **I want** to add multiple vehicles with documents (registration, insurance, fitness), **so that** my cars can be used for rides.
- **AC1:** Given I add a vehicle with valid docs, then it appears in my fleet as `Available`.
- **AC2:** Given a document (insurance) expires, then the vehicle is auto-flagged `Inactive` until updated.

### F-3 — Onboard & assign drivers
**As a** fleet owner, **I want** to invite/assign drivers to my vehicles, **so that** they can drive my cars.
- **AC1:** Given I send a driver invite, when they accept, then they're linked to my fleet.
- **AC2:** Given I assign a car to a driver, then only that driver can go online with it.

### F-4 — Set rental terms
**As a** fleet owner, **I want** to define rental/revenue-share terms with drivers (daily rent or % split), **so that** earnings are divided correctly.
- **AC1:** Given a configured split, when a ride completes, then revenue is divided between driver, fleet owner, and platform per the terms.

### F-5 — Monitor fleet in real time
**As a** fleet owner, **I want** a dashboard showing each vehicle's status, location, and active driver, **so that** I can oversee operations.
- **AC1:** Given vehicles are online, then I see live positions and current ride status.

### F-6 — View fleet earnings & reports
**As a** fleet owner, **I want** earnings reports per vehicle and per driver, **so that** I can measure profitability.
- **AC1:** Given a date range, then I see gross revenue, my share, commissions, and trips per vehicle.

### F-7 — Receive settlements / payouts
**As a** fleet owner, **I want** to receive my revenue share via scheduled payouts, **so that** I get paid reliably.
- **AC1:** Given the settlement cycle runs, then my share is transferred and a statement is generated.

### F-8 — Manage maintenance & availability
**As a** fleet owner, **I want** to mark vehicles as under maintenance, **so that** they aren't assigned rides while unavailable.

### F-9 — Handle driver performance
**As a** fleet owner, **I want** to see driver ratings, trips, and incidents for my fleet, **so that** I can manage my team.
- **AC1:** Given a driver's rating drops below a threshold, then I'm alerted.

### F-10 — Suspend a driver or vehicle
**As a** fleet owner, **I want** to suspend a driver or pull a vehicle from service, **so that** I control my assets.

### F-11 — Approve rental requests & receive rent
**As a** fleet owner, **I want** to approve which driver may rent which vehicle and receive their rent payments, **so that** my cars generate revenue under terms I control.
- **AC1:** Given a driver's rental request, when I approve it with terms (daily rent or % split), then the vehicle is assigned to that driver.
- **AC2:** Given the rent cycle runs, then I receive the rent (or my revenue share) and a statement is generated.

### F-12 — Ratings & reviews with drivers and corporate clients
**As a** fleet owner, **I want** to give and receive ratings/reviews with my drivers and with Corporate Clients, **so that** trust is maintained on both sides.
- **AC1:** Given a completed rental period or corporate engagement, then both parties can submit a rating that is recorded.

---

# 4. Corporate Client

> A company that books transportation for its employees from Fleet/Vehicle Owners and is billed periodically rather than per-ride at point of use.

### C-1 — Register as a corporate client
**As a** corporate client, **I want** to register my company and set up a billing/credit agreement, **so that** my employees can book rides on company account.
- **AC1:** Given I submit company details and billing terms, then my account goes to `Pending Approval` until staff approve the agreement.

### C-2 — Manage employee list
**As a** corporate client, **I want** to add/remove employees who can book under the company, **so that** only authorized staff use the account.
- **AC1:** Given I add an employee, then they can book rides billed to the company within their limits.

### C-3 — Set spending limits & approval rules
**As a** corporate client, **I want** to set per-employee spending limits and approval rules, **so that** travel spend stays controlled.
- **AC1:** Given an employee exceeds their limit, then the booking is blocked or routed for approval.

### C-4 — Book transportation for employees
**As a** corporate client, **I want** to book rides for employees from a Fleet/Vehicle Owner, **so that** staff transport is arranged.
- **AC1:** Given a booking request, then a vehicle is provided (auto-allocated by the platform or from a selected fleet) and billed to the company.

### C-5 — Schedule recurring rides
**As a** corporate client, **I want** to schedule recurring rides (e.g. daily employee shuttles), **so that** routine transport runs automatically.
- **AC1:** Given a recurrence rule, then rides are auto-created per schedule until I cancel it.

### C-6 — Manage company billing
**As a** corporate client, **I want** to view and manage consolidated company billing/invoices, **so that** I can reconcile travel spend.
- **AC1:** Given a billing period closes, then I receive a consolidated invoice covering all employee rides.

### C-7 — View consolidated trip & spend reports
**As a** corporate client, **I want** consolidated trip and spend reports, **so that** I can analyze usage by employee, department, and period.

### C-8 — Rate & review Fleet/Vehicle Owners
**As a** corporate client, **I want** to rate and review the Fleet/Vehicle Owners that serve us, **so that** service quality is held accountable.

---

# 5. Super Admin (Platform Operator)

> **Super Admin** owns global configuration. Operational duties (verification, monitoring, complaints) belong to **Support Admin** (section 6); money duties (payouts, refunds, commissions) belong to **Finance Admin** (section 7).

### A-1 — Manage all users
**As a** super admin, **I want** to search, view, suspend, or ban any user — and create Support Admin and Finance Admin staff accounts, **so that** I control access and enforce policies.
- **AC1:** Given I create a staff account, then that user can sign in with the assigned role's permissions.

### A-2 — Configure pricing & surge
**As a** super admin, **I want** to set base fare, per-km/per-min rates, and surge rules, **so that** pricing matches market conditions.
- **AC1:** Given I update a pricing rule, then new rides use the updated rates.

### A-3 — Configure the fare-split / commission model
**As a** super admin, **I want** to define how each fare splits between platform commission, Vehicle Owner cut, and driver earnings, **so that** every completed ride settles correctly.
- **AC1:** Given a configured split, when a ride completes, then the fare is divided per the model and recorded on the trip.

### A-4 — Create & manage coupons
**As a** super admin, **I want** to create, pause, and expire coupons with rules (type, value, caps, validity, usage limits, geo, cost-borne-by), **so that** I can run promotions.
- **AC1:** Given I set usage limits, validity window, and `cost_borne_by`, then the system enforces them at apply time and logs the discount against the correct cost owner.

### A-5 — Manage cities & zones
**As a** super admin, **I want** to manage cities, zones, and geofences, **so that** service coverage and zone-based rules are controlled.

### A-6 — View analytics & reports
**As a** super admin, **I want** revenue, ride, and growth analytics, **so that** I can make decisions.

### A-7 — Manage permissions (RBAC)
**As a** super admin, **I want** to manage roles and permissions, **so that** each role has exactly the access it needs.

### A-8 — System configuration & audit
**As a** super admin, **I want** system-wide configuration and an audit trail of sensitive actions, **so that** the platform is configurable, accountable, and secure.

---

# 6. Support Admin (Operations)

### S-1 — Driver & owner onboarding / verification
**As a** support admin, **I want** to review and approve/reject KYC submissions for drivers, vehicles, fleet owners, and corporate clients, **so that** only legitimate users operate.
- **AC1:** Given a pending submission, when I approve, then the applicant is notified and activated.

### S-2 — Monitor live operations & active trips
**As a** support admin, **I want** a real-time dashboard of active rides, online drivers, and demand heatmaps, **so that** I can monitor supply/demand and spot stuck trips.

### S-3 — Create bookings manually
**As a** support admin, **I want** to create call-center/manual bookings on behalf of customers, **so that** users without the app can still be served.

### S-4 — Manage support tickets & complaints
**As a** support admin, **I want** to view, respond to, and resolve tickets and customer complaints, **so that** users get help.
- **AC1:** Given an open ticket, when I reply, then the user is notified.

### S-5 — Access ride context
**As a** support admin, **I want** to see ride details, driver/customer info, and chat/call logs, **so that** I can resolve issues quickly.

### S-6 — Handle safety incidents & emergencies
**As a** support admin, **I want** to receive and act on SOS alerts and resolve emergencies, **so that** incidents are handled fast.
- **AC1:** Given an SOS is triggered, then I see the live location and escalation options.

### S-7 — Fraud detection
**As a** support admin, **I want** to flag and investigate suspicious accounts/rides, **so that** fraud is contained.

### S-8 — Handle disputes & moderate reviews
**As a** support admin, **I want** to review fare disputes and reported reviews and hide abusive content, **so that** the platform stays fair and trustworthy.
- **AC1:** Given a fare dispute, when I find it valid, then I escalate the refund to Finance Admin.

---

# 7. Finance Admin (Money)

> Split from Support Admin for **separation of duties** — whoever verifies a driver must not also approve that driver's payout.

### FN-1 — Process driver & fleet payouts
**As a** finance admin, **I want** to run driver and fleet-owner payout cycles, **so that** everyone is paid accurately and on time.

### FN-2 — Corporate invoicing
**As a** finance admin, **I want** to generate and reconcile consolidated invoices for corporate clients, **so that** company billing is correct.

### FN-3 — Reconcile payments & manage commissions
**As a** finance admin, **I want** to reconcile gateway transactions (cards, bKash/Nagad) with rides and compute platform commission, **so that** the books are correct and revenue is tracked.

### FN-4 — Generate financial reports
**As a** finance admin, **I want** to export revenue, tax, payout, and coupon-cost reports, **so that** I can meet accounting/compliance needs.

### FN-5 — Handle refunds & adjustments
**As a** finance admin, **I want** to process refunds and manual adjustments (including reversing coupon discounts per `cost_borne_by`), **so that** disputes are settled financially.

---

# 8. Guest (Unregistered Visitor)

### G-1 — Browse the app/site
**As a** guest, **I want** to explore how the service works and see fare estimates, **so that** I can decide to sign up.
- **AC1:** Given I enter a route on the public site, then I can see an indicative fare without logging in.

### G-2 — Prompted to register
**As a** guest, **I want** to be prompted to sign up when I try to book, **so that** I can start using the service.

---

## Cross-Cutting / Non-Functional Stories

| ID | Story |
|---|---|
| NF-1 | **As a** user, **I want** the app to respond quickly (<300ms typical API), **so that** it feels smooth. |
| NF-2 | **As a** user, **I want** my data encrypted and privacy respected, **so that** I trust the platform. |
| NF-3 | **As an** operator, **I want** the system to scale during peak demand, **so that** rides aren't dropped. |
| NF-4 | **As a** user, **I want** the app available in English and Bangla, **so that** it's accessible locally. |
| NF-5 | **As an** operator, **I want** audit logging and monitoring, **so that** issues are detected early. |
| NF-6 | **As a** user, **I want** graceful offline handling, **so that** poor connectivity doesn't break my ride. |

---

## Role → Key Capabilities Matrix

| Capability | Customer | Driver | Fleet Owner | Corporate | Support Admin | Finance Admin | Super Admin |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Book/take ride | ✅ | ✅ | — | for employees | manual | — | — |
| Manage vehicles | — | rent/assigned | ✅ | — | verify | — | config |
| Manage drivers | — | — | ✅ | — | onboard/verify | — | manage all |
| Rent car ↔ pay/receive rent | — | pay rent | receive rent | — | — | reconcile | — |
| Pricing / fare-split | — | — | set rental terms | — | — | commissions | ✅ |
| Coupons | apply | — | — | apply | — | reconcile cost | create |
| Payouts / settlements | — | request | receive | invoiced | — | ✅ | oversee |
| Disputes / refunds | raise | raise | — | raise | handle dispute | process refund | oversee |
| Analytics | own | own | fleet | company spend | ops | financial | full |
| Reviews / ratings | ✅ | ✅ | with driver & corporate | rate owner | moderate | — | — |

---

*Generated for BD_Cabs · Aligned with role_wise_story.md · Last updated 2026-06-17*
