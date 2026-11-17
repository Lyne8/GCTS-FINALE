export type RouteStatus =
  | 'draft'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type StopStatus = 'pending' | 'collected' | 'skipped';

export type RouteStop = {
  binId: string;
  name: string;
  status: StopStatus;
  collectedAt: Date | null;
  skipReason: string | null;
};

export type CollectionRoute = {
  id: string;
  code: string;
  name: string;
  divisionId: string;
  vehicleId: string;
  collectorUid: string | null;
  status: RouteStatus;
  stops: RouteStop[];
  progressPercent: number;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function calculateRouteProgress(stops: RouteStop[]): number {
  if (stops.length === 0) {
    return 0;
  }
  const handled = stops.filter(
    (stop) => stop.status === 'collected' || stop.status === 'skipped'
  ).length;
  return Math.round((handled / stops.length) * 100);
}

export function isValidRouteStatusTransition(
  current: RouteStatus,
  next: RouteStatus
): boolean {
  switch (current) {
    case 'draft':
      return next === 'assigned' || next === 'cancelled';
    case 'assigned':
      return next === 'in_progress' || next === 'cancelled';
    case 'in_progress':
      return next === 'completed' || next === 'cancelled';
    case 'completed':
    case 'cancelled':
      return false;
  }
}
