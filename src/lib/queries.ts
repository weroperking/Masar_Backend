import { eq, and, isNull } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { students, courses, Student, Course } from "../db/schema";

export function withTenantOrgId<T extends { orgId: string }>(
  orgId: string
) {
  return (whereClause: any) => and(whereClause, eq((t: T) => t.orgId, orgId));
}

export function withTenantOrgIdEq<T>(
  orgId: string
) {
  return eq((T as any).orgId, orgId);
}

export function tenantFilter<T extends { orgId: string }>(
  table: { orgId: any },
  orgId: string
) {
  return eq(table.orgId, orgId);
}
