import { proxyAdminRead } from "@/lib/admin-proxy";

export async function GET() {
  return proxyAdminRead("/api/v1/admin/dashboard");
}
