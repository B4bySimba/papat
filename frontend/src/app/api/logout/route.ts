import { NextResponse } from "next/server";

export async function POST() {
  try {
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
