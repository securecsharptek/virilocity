import { eq } from 'drizzle-orm';
import { db } from './client';
import { dashboardStates } from './schema';
import {
  getTenantDashboardState as getTenantDashboardStateCache,
  setTenantDashboardState as setTenantDashboardStateCache,
} from '../cache/dashboard-store';

const hasDatabaseUrl = (): boolean => Boolean(process.env['DATABASE_URL']?.trim());

const cloneValue = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

export const getTenantDashboardState = async <T>(tenantId: string, initialValue: T): Promise<T> => {
  if (!hasDatabaseUrl()) {
    return getTenantDashboardStateCache(tenantId, initialValue);
  }

  try {
    const rows = await db
      .select({ state: dashboardStates.state })
      .from(dashboardStates)
      .where(eq(dashboardStates.tenantId, tenantId))
      .limit(1);

    const row = rows[0];
    if (row?.state) {
      return row.state as T;
    }
  } catch {
    return getTenantDashboardStateCache(tenantId, initialValue);
  }

  return cloneValue(initialValue);
};

export const setTenantDashboardState = async <T>(tenantId: string, value: T): Promise<void> => {
  await setTenantDashboardStateCache(tenantId, value);

  if (!hasDatabaseUrl()) {
    return;
  }

  try {
    await db
      .insert(dashboardStates)
      .values({
        tenantId,
        state: value,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: dashboardStates.tenantId,
        set: {
          state: value,
          updatedAt: new Date(),
        },
      });
  } catch {
    // Cache fallback is already updated.
  }
};
