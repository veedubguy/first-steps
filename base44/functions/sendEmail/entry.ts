import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    console.log('[sendEmail] payload received:', JSON.stringify(body));

    const { to, subject, body: emailBody, from_name } = body;

    if (!to || !subject || !emailBody) {
      console.log('[sendEmail] missing fields - to:', to, 'subject:', subject, 'body length:', emailBody?.length);
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const senderName = from_name || 'First Steps OSHC';

    console.log('[sendEmail] sending to:', to, 'subject:', subject);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${senderName} <noreply@firststepsasc.com>`,
        to: [to],
        subject,
        text: emailBody,
      }),
    });

    const data = await res.json();
    console.log('[sendEmail] Resend response status:', res.status, 'data:', JSON.stringify(data));

    if (!res.ok) {
      return Response.json({ error: data.message || 'Resend error' }, { status: res.status });
    }

    return Response.json({ success: true, id: data.id });
  } catch (error) {
    console.log('[sendEmail] caught error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});