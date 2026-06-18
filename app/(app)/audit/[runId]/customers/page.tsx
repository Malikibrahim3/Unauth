/**
 * /audit/[runId]/customers — legacy standalone customers page.
 *
 * Redirect old audit customer URLs into the current customer intelligence area.
 */
import { redirect } from 'next/navigation';

export default function CustomersPageRedirect() {
  redirect('/customers');
}
