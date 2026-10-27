import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

export async function POST() {
  try {
    // Recorded in the activity log; the cookie is cleared even if the backend can't be reached.
    await backendFetch(`${process.env.BACKEND_API_URL}/auth/logout`, { method: "POST" }).catch(() => null);
    const response = new NextResponse(
      JSON.stringify({ success: true, message: "Logged out successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

    // Clear the cookie
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0), // Alternative to maxAge: 0
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Logout failed" },
      { status: 500 }
    );
  }
}
