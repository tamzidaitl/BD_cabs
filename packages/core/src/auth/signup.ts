import { Role } from '../models/enums';

/**
 * Signup domain: the catalogue of self-registerable account types and the pure
 * validation for the account step. Lives in core (not the web app) so the
 * future React Native signup screen reuses the exact same role definitions,
 * activation rules, and field validation — only the UI differs.
 *
 * Activation gate mirrors role_wise_story.md / API_ENDPOINTS.md §1:
 *   Customer  → active immediately
 *   Driver / FleetOwner / Corporate → pending until verified/approved
 */
export interface SignupRoleInfo {
  role: Role;
  label: string;
  tagline: string;
  description: string;
  /** lucide-react icon name, resolved by the host UI. */
  icon: string;
  /** True if the account can transact right after signup. */
  activeImmediately: boolean;
  /** What the applicant must provide for verification (shown pre/post signup). */
  requirements: string[];
  /** One-line "what happens next" shown on the success screen. */
  nextSteps: string;
}

export const SIGNUP_ROLES: SignupRoleInfo[] = [
  {
    role: Role.Customer,
    label: 'Customer',
    tagline: 'Book rides',
    description: 'Ride across the city — book instantly, track your driver, and pay your way.',
    icon: 'User',
    activeImmediately: true,
    requirements: [],
    nextSteps: 'Your account is active. Download the BD Cabs app to book your first ride.',
  },
  {
    role: Role.Driver,
    label: 'Driver',
    tagline: 'Drive & earn',
    description: 'Accept ride requests and earn on your schedule — as an owner-driver or renting a vehicle.',
    icon: 'Car',
    activeImmediately: false,
    requirements: ['Driving licence', 'National ID (NID)', 'A vehicle you own or rent'],
    nextSteps:
      'Your account is pending. Submit your licence and NID in the driver app to get verified.',
  },
  {
    role: Role.FleetOwner,
    label: 'Fleet / Vehicle Owner',
    tagline: 'List vehicles',
    description: 'Register your vehicles, onboard drivers, set rental terms, and track revenue.',
    icon: 'Building2',
    activeImmediately: false,
    requirements: ['Trade licence', 'National ID (NID)', 'Bank account details', 'Vehicle papers'],
    nextSteps:
      'Your account is pending KYC. Submit your trade licence and bank details to start listing vehicles.',
  },
  {
    role: Role.Corporate,
    label: 'Corporate Client',
    tagline: 'Manage travel',
    description: 'Book and manage employee travel with consolidated billing and spend controls.',
    icon: 'Briefcase',
    activeImmediately: false,
    requirements: ['Company details', 'Billing / credit agreement'],
    nextSteps:
      'Your account is pending approval. Our team will review your billing agreement and be in touch.',
  },
];

export const getSignupRole = (role: Role): SignupRoleInfo | undefined =>
  SIGNUP_ROLES.find((r) => r.role === role);

// ---- Gender + country-code catalogues ------------------------------------

/**
 * Gender options. Bangladesh legally recognizes a third gender (hijra), so the
 * signup offers Male / Female / Third gender. Values are the wire format stored
 * by the backend.
 */
export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'third-gender', label: 'Third gender' },
] as const;

export type Gender = (typeof GENDERS)[number]['value'];

export const isGender = (v: string): v is Gender => GENDERS.some((g) => g.value === v);

/**
 * Dialing codes shown in the phone-number input. Bangladesh leads as the default
 * market; extend as BD Cabs expands. `code` is concatenated with the national
 * number to build the E.164 phone sent to the backend.
 */
export const COUNTRY_CODES = [
  { code: '+880', country: 'Bangladesh', iso: 'BD' },
  { code: '+91', country: 'India', iso: 'IN' },
  { code: '+92', country: 'Pakistan', iso: 'PK' },
  { code: '+977', country: 'Nepal', iso: 'NP' },
  { code: '+94', country: 'Sri Lanka', iso: 'LK' },
  { code: '+971', country: 'United Arab Emirates', iso: 'AE' },
  { code: '+966', country: 'Saudi Arabia', iso: 'SA' },
  { code: '+60', country: 'Malaysia', iso: 'MY' },
  { code: '+65', country: 'Singapore', iso: 'SG' },
  { code: '+44', country: 'United Kingdom', iso: 'GB' },
  { code: '+1', country: 'United States / Canada', iso: 'US' },
] as const;

/** Default dialing code (Bangladesh). */
export const DEFAULT_COUNTRY_CODE = COUNTRY_CODES[0].code;

/** Builds the E.164 phone the backend stores, e.g. ('+880', '1712 345678') → '+8801712345678'. */
export function buildE164Phone(countryCode: string, nationalNumber: string): string {
  return `${countryCode}${nationalNumber.replace(/[\s-]/g, '')}`;
}

// ---- Account-step validation ---------------------------------------------

export interface SignupAccountValues {
  firstName: string;
  lastName: string;
  gender: string;
  /** Dialing code, e.g. "+880". */
  countryCode: string;
  /** National number only (without the dialing code). */
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type SignupErrors = Partial<Record<keyof SignupAccountValues, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** National number: 6–15 digits (spaces/dashes allowed, stripped before sending). */
const PHONE_RE = /^[0-9\s-]{6,18}$/;
const NAME_MAX = 75;

/** Minimum password length — matches the backend RegisterDto ([MinLength(6)]). */
export const PASSWORD_MIN_LENGTH = 6;

/** Pure, synchronous validation for the account fields. Returns a field→message map. */
export function validateSignupAccount(v: SignupAccountValues): SignupErrors {
  const errors: SignupErrors = {};

  if (!v.firstName.trim()) errors.firstName = 'First name is required.';
  else if (v.firstName.trim().length > NAME_MAX) errors.firstName = 'First name is too long.';

  if (!v.lastName.trim()) errors.lastName = 'Last name is required.';
  else if (v.lastName.trim().length > NAME_MAX) errors.lastName = 'Last name is too long.';

  if (!v.gender) errors.gender = 'Please select a gender.';
  else if (!isGender(v.gender)) errors.gender = 'Please select a valid gender.';

  if (!v.email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Enter a valid email address.';

  if (!v.countryCode) errors.countryCode = 'Select a country code.';

  if (!v.phone.trim()) errors.phone = 'Phone number is required.';
  else if (!PHONE_RE.test(v.phone.trim())) errors.phone = 'Enter a valid phone number.';

  if (!v.password) errors.password = 'Password is required.';
  else if (v.password.length < PASSWORD_MIN_LENGTH)
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;

  if (v.confirmPassword !== v.password) errors.confirmPassword = 'Passwords do not match.';

  return errors;
}
