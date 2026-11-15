import type { DashboardCardProps } from '../../types/dashboard-cards';
import { NightSkyCard } from './NightSkyCard';
/** Keep existing header card placements when upgrading to target planning. */
export function WeatherHeaderCard(props: DashboardCardProps) { return <NightSkyCard {...props} compact />; }
