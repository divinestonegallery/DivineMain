// @ts-nocheck
// drizzle removed
// db removed
// schema removed

export async function getAdminDashboardSummary() {
  const db = getDb();
  const [productRows, orderRows, customerRows, commissionRows, notificationRows, recentOrders, recentCommissions] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${products.status} = 'active')::int`,
      drafts: sql<number>`count(*) filter (where ${products.status} = 'draft')::int`,
    }).from(products),
    db.select({
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) filter (where ${orders.status} not in ('delivered', 'cancelled', 'returned'))::int`,
      approvalPending: sql<number>`count(*) filter (where ${orders.status} = 'approval_pending' or ${orders.codApprovalStatus} = 'pending')::int`,
      paidRevenuePaise: sql<number>`coalesce(sum(${orders.totalPaise}) filter (where ${orders.paymentStatus} = 'paid'), 0)::bigint`,
    }).from(orders),
    db.select({
      total: sql<number>`count(*) filter (where ${users.status} = 'active')::int`,
    }).from(users),
    db.select({
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) filter (where ${customCommissions.status} not in ('completed', 'cancelled'))::int`,
      awaitingApproval: sql<number>`count(*) filter (where ${customCommissions.status} = 'awaiting_approval')::int`,
    }).from(customCommissions),
    db.select({
      queued: sql<number>`count(*) filter (where ${notifications.status} in ('queued', 'processing'))::int`,
      failed: sql<number>`count(*) filter (where ${notifications.status} = 'failed')::int`,
    }).from(notifications),
    db.select({ orderNumber: orders.orderNumber, status: orders.status, paymentStatus: orders.paymentStatus, totalPaise: orders.totalPaise, placedAt: orders.placedAt })
      .from(orders).orderBy(desc(orders.placedAt)).limit(5),
    db.select({ commissionNumber: customCommissions.commissionNumber, title: customCommissions.title, status: customCommissions.status, updatedAt: customCommissions.updatedAt })
      .from(customCommissions).orderBy(desc(customCommissions.updatedAt)).limit(5),
  ]);

  return {
    products: productRows[0],
    orders: orderRows[0],
    customers: customerRows[0],
    commissions: commissionRows[0],
    notifications: notificationRows[0],
    recentOrders,
    recentCommissions,
  };
}
