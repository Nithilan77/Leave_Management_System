/**
 * Navigation config for the Manager role.
 * Same idea as employeeNav.js / hrNav.js: one list shared by every manager page.
 *
 * A manager is also an employee: besides reviewing their team's requests, they
 * can view their own leave balance, apply for leave, and track their own
 * requests. Their own request is routed for approval to THEIR manager (set by
 * HR), exactly like any other employee.
 */
export const managerNav = [
  { label: 'Approval Queue', path: '/manager' },
  { label: 'My Balance', path: '/' },
  { label: 'Apply for Leave', path: '/apply' },
  { label: 'My Requests', path: '/my-requests' },
  { label: 'Holiday Calendar', path: '/calendar' },
];
