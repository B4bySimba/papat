import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiUrl = process.env.BACKEND_API_URL;
    if (!apiUrl) {
      return NextResponse.json(
        { error: "Backend API URL not configured." },
        { status: 500 }
      );
    }

    const res = await fetch(`${apiUrl}/house/withUnits`);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend responded with status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "Unexpected response format." },
        { status: 500 }
      );
    }

    const sorted = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
    return NextResponse.json(sorted);
  } catch (error: any) {
    console.error("Error fetching house names:", error);
    return NextResponse.json(
      { error: "Failed to fetch house names." },
      { status: 500 }
    );
  }
}
