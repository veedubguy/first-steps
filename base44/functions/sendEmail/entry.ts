import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, body, from_name } = await req.json();

    const senderName = from_name || 'First Steps OSHC';

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
        text: body,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ error: data.message || 'Resend error' }, { status: res.status });
    }

    return Response.json({ success: true, id: data.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});