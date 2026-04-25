import { NextRequest } from "next/server";
import { auth } from "./index";

export async function getSessionFromRequest(request: NextRequest) {
  return auth.api.getSession({ headers: request.headers });
}
