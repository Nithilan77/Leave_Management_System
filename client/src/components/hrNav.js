/**
 * Navigation config for the HR role.
 * Same idea as employeeNav.js: one list shared by every HR page.
 *
 * HR runs the console (Overview, Approvals, Users, Leave Types, Reports) and,
 * like any employee, can also view their own balance, apply for leave, and
 * track their own requests. HR's own request is approved by their own manager
 * (if assigned) or by another HR user from the Approvals screen.
 */
export const hrNav = [
  { label: 'Overview', path: '/hr' },
  { label: 'Approvals', path: '/hr/approvals' },
  { label: 'Users', path: '/hr/users' },
  { label: 'Leave Types', path: '/hr/leave-types' },
  { label: 'Reports', path: '/hr/reports' },
  { label: 'My Balance', path: '/' },
  { label: 'Apply for Leave', path: '/apply' },
  { label: 'My Requests', path: '/my-requests' },
  { label: 'Holiday Calendar', path: '/calendar' },
];
