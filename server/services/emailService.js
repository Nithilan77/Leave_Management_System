const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'Leave Management System <onboarding@resend.dev>';

const sendEmail = async ({ to, subject, html }) => {
  if (!to) return;
  if (!resend) {
    console.log(`[email skipped — RESEND_API_KEY not set] "${subject}" -> ${to}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error(`Email send failed ("${subject}" -> ${to}):`, err.message);
  }
};

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric',
});

const wrapper = (title, bodyHtml) => `
  <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
    <h2 style="color: #1e3a5f;">${title}</h2>
    ${bodyHtml}
    <p style="color: #888; font-size: 12px; margin-top: 24px;">
      Leave Management System — automated notification, please do not reply.
    </p>
  </div>
`;

const notifyLeaveRequestSubmitted = async (managerEmail, {
  managerName, employeeName, leaveTypeName, startDate, endDate, days, reason,
}) => {
  await sendEmail({
    to: managerEmail,
    subject: `Leave request from ${employeeName} needs your review`,
    html: wrapper('New Leave Request', `
      <p>Hi ${managerName || 'there'},</p>
      <p><strong>${employeeName}</strong> has applied for <strong>${leaveTypeName}</strong>:</p>
      <ul>
        <li><strong>From:</strong> ${formatDate(startDate)}</li>
        <li><strong>To:</strong> ${formatDate(endDate)}</li>
        <li><strong>Working days:</strong> ${days}</li>
        <li><strong>Reason:</strong> ${reason || '—'}</li>
      </ul>
      <p>Please review it in the Approval Queue.</p>
    `),
  });
};

const notifyLeaveReviewed = async (employeeEmail, {
  employeeName, status, leaveTypeName, startDate, endDate, days, comment,
}) => {
  const approved = status === 'APPROVED';
  await sendEmail({
    to: employeeEmail,
    subject: `Your ${leaveTypeName} request was ${approved ? 'approved' : 'rejected'}`,
    html: wrapper(`Leave Request ${approved ? 'Approved' : 'Rejected'}`, `
      <p>Hi ${employeeName || 'there'},</p>
      <p>Your <strong>${leaveTypeName}</strong> request
        (${formatDate(startDate)} – ${formatDate(endDate)}, ${days} working day${days === 1 ? '' : 's'})
        has been <strong style="color: ${approved ? '#2e7d32' : '#c62828'};">${approved ? 'APPROVED' : 'REJECTED'}</strong>.
      </p>
      ${comment ? `<p><strong>Reviewer comment:</strong> ${comment}</p>` : ''}
    `),
  });
};

module.exports = { notifyLeaveRequestSubmitted, notifyLeaveReviewed };