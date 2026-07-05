import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leaseCode = searchParams.get("leaseCode");

  if (!leaseCode) {
    return NextResponse.json({ error: "Missing leaseCode" }, { status: 400 });
  }

  try {
    const backendUrl = `${process.env.BACKEND_API_URL}/payment/le/${leaseCode}/summary`;
    const resp = await fetch(backendUrl);

    if (!resp.ok) {
      return NextResponse.json(
        { error: `Backend error: ${resp.statusText}` },
        { status: resp.status }
      );
    }

    const data = await resp.json();

    return NextResponse.json(data);
  } catch (err) {
    console.error("Error in invoiceItems API:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
