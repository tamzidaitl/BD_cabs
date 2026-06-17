/**
 * @bd-cabs/core — platform-agnostic business logic.
 *
 * Import rule: nothing in this package may import from `next`, `react-dom`,
 * `react-bootstrap`, the DOM, or any RN-only module. Only `react`,
 * `@tanstack/react-query`, and `zustand` are allowed runtime peers. This is
 * what lets the future React Native app reuse every line here unchanged.
 */
export * from './models';
export * from './rbac';
export * from './api';
export * from './auth';
export * from './query';
export * from './realtime';
export * from './utils';
