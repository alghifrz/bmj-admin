import { proxyAdminWrite } from "@/lib/admin-proxy";

export async function POST(request: Request) {
  return proxyAdminWrite(request, "/api/v1/admin/store/locations");
}
