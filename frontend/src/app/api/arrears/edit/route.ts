import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { leaseId, arrearsbf } = body;

  if (!leaseId) {
    return NextResponse.json({ error: "Missing leaseId" }, { status: 400 });
  }

  const res = await fetch(
    `${process.env.BACKEND_API_URL}/tenant/arrearsbf/${leaseId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ arrearsbf }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  return NextResponse.json(data);
}
