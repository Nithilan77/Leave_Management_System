import { employeeNav } from './employeeNav';
import { managerNav } from './managerNav';
import { hrNav } from './hrNav';

/**
 * navForRole
 * -----------
 * Returns the correct navigation list for a user's role. Used by the shared
 * self-service pages (Dashboard, Apply for Leave, My Requests) so that a
 * manager who opens them keeps their manager nav (with the Approval Queue
 * link) instead of being shown the employee nav.
 *
 *   employee -> employeeNav
 *   manager  -> managerNav
 *   hr       -> hrNav
 */
export const navForRole = (role) => {
  if (role === 'manager') return managerNav;
  if (role === 'hr') return hrNav;
  return employeeNav;
};
