import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") || "";

  try {
    const backendRes = await fetch(
      `${process.env.BACKEND_API_URL}/tenant/search?query=${search}`,
      { cache: "no-store" }
    );

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: `Backend error: ${backendRes.status}` },
        { status: backendRes.status }
      );
    }

    const options = await backendRes.json();


    return NextResponse.json({ options });
  } catch (error) {
    console.error("Tenants Proxy Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
