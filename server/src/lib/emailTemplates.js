// Plain, readable HTML email templates. Kept intentionally simple (no external
// images/fonts) so they render cleanly in Gmail's clipped preview and on mobile.

function shell(bodyHtml) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1F2A24;">
    <div style="background:#16352B; color:#F6F3E7; padding:16px 20px; border-radius:8px 8px 0 0;">
      <strong style="font-size:16px;">ACAD Online Classroom</strong>
    </div>
    <div style="border:1px solid #E4DFCE; border-top:none; padding:20px; border-radius:0 0 8px 8px;">
      ${bodyHtml}
    </div>
    <p style="font-size:11px; color:#5B6B63; margin-top:12px;">
      You're receiving this because you're enrolled in an ACAD class. This is an automated message.
    </p>
  </div>`;
}

function formatTimeRange(startTime, endTime) {
  const opts = { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" };
  const dateOpts = { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" };
  const start = new Date(startTime);
  const end = new Date(endTime);
  return {
    date: start.toLocaleDateString("en-IN", dateOpts),
    time: `${start.toLocaleTimeString("en-IN", opts)} - ${end.toLocaleTimeString("en-IN", opts)}`,
  };
}

export function classScheduledEmail({ recipientName, subject, batchName, tutorName, startTime, endTime, meetUrl }) {
  const { date, time } = formatTimeRange(startTime, endTime);
  return {
    subject: `Class scheduled: ${subject} (${batchName}) - ${date}`,
    html: shell(`
      <p>Hi ${recipientName},</p>
      <p>A class has been scheduled:</p>
      <table style="width:100%; font-size:14px; margin:12px 0;">
        <tr><td style="color:#5B6B63; padding:4px 0;">Subject</td><td><strong>${subject}</strong></td></tr>
        <tr><td style="color:#5B6B63; padding:4px 0;">Batch</td><td>${batchName}</td></tr>
        <tr><td style="color:#5B6B63; padding:4px 0;">Tutor</td><td>${tutorName}</td></tr>
        <tr><td style="color:#5B6B63; padding:4px 0;">Date</td><td>${date}</td></tr>
        <tr><td style="color:#5B6B63; padding:4px 0;">Time</td><td>${time}</td></tr>
      </table>
      <p>
        <a href="${meetUrl}" style="background:#E8A33D; color:#0E241C; text-decoration:none; padding:10px 18px; border-radius:6px; font-weight:bold; display:inline-block;">
          Join Google Meet
        </a>
      </p>
      <p style="font-size:13px; color:#5B6B63;">This link stays the same for every session of this class - you don't need to look for a new one each time.</p>
    `),
  };
}

export function classStartingSoonEmail({ recipientName, subject, batchName, minutesUntilStart, meetUrl }) {
  return {
    subject: `Starting in ${minutesUntilStart} min: ${subject} (${batchName})`,
    html: shell(`
      <p>Hi ${recipientName},</p>
      <p><strong>${subject}</strong> (${batchName}) starts in about ${minutesUntilStart} minutes.</p>
      <p>
        <a href="${meetUrl}" style="background:#E8A33D; color:#0E241C; text-decoration:none; padding:10px 18px; border-radius:6px; font-weight:bold; display:inline-block;">
          Join Google Meet
        </a>
      </p>
    `),
  };
}
