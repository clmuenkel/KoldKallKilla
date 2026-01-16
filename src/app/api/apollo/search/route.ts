import { NextRequest, NextResponse } from "next/server";
import { searchApolloContacts } from "@/lib/apollo/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, ...params } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Apollo API key is required" },
        { status: 400 }
      );
    }

    const results = await searchApolloContacts(apiKey, params);
    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Apollo search error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search Apollo" },
      { status: 500 }
    );
  }
}
