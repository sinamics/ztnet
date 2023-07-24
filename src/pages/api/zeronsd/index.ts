import { type NextRequest, type NextResponse } from "next/server";

export default function handler(req: NextRequest, res: NextResponse) {
  console.log("zeronds called!!!!!");
  res.status(200).json({ name: "John Doe" });
}
