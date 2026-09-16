import { eq, and, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

type TenantTable = { orgId: AnyPgColumn<{ data: string }> };

export function withTenantOrgId(table: TenantTable, orgId: string) {
  return (whereClause: SQL | undefined) => and(whereClause, eq(table.orgId, orgId));
}

export function withTenantOrgIdEq(table: TenantTable, orgId: string) {
  return eq(table.orgId, orgId);
}

export function tenantFilter(table: TenantTable, orgId: string) {
  return eq(table.orgId, orgId);
}
