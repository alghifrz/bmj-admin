import { proxyAdminRead, proxyAdminWrite } from "@/lib/admin-proxy";

export async function GET() {
  return proxyAdminRead("/api/v1/admin/store");
}

export async function PATCH(request: Request) {
  return proxyAdminWrite(request, "/api/v1/admin/store");
}
