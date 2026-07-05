import { NextRequest, NextResponse } from "next/server";


function sanitize(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "number" && isNaN(value) ? null : value
    )
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sanitized = sanitize(body);

  try {
    const response = await fetch(
      process.env.BACKEND_API_URL + "/house/createProperty",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitized),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error }, { status: 500 });
    }

    const result = await response.json();
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
