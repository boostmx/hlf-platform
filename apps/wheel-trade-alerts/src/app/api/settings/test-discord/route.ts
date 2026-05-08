import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ webhookUrl: z.string().url() });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid URL." }, { status: 400 });

  const res = await fetch(parsed.data.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title: "HLF Wheel Alerts — Test",
        description: "Your Discord notifications are working correctly.",
        color: 0xf59e0b,
        footer: { text: "HLF Wheel Alerts" },
        timestamp: new Date().toISOString(),
      }],
    }),
  });

  if (!res.ok) return NextResponse.json({ error: "Discord rejected the webhook." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
