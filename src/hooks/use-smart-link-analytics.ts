import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

export interface ClicksByDay {
  date: string;
  clicks: number;
}

export interface ClicksByDevice {
  device: string;
  clicks: number;
}

export interface ClicksByReferrer {
  referrer: string;
  clicks: number;
}

export interface SmartLinkAnalytics {
  totalClicks: number;
  clicksByDay: ClicksByDay[];
  clicksByDevice: ClicksByDevice[];
  clicksByReferrer: ClicksByReferrer[];
}

export function useSmartLinkAnalytics(smartLinkId?: string, days: number = 30) {
  return useQuery({
    queryKey: ['smart-link-analytics', smartLinkId, days],
    queryFn: async (): Promise<SmartLinkAnalytics> => {
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      let query = supabase
        .from('smart_link_clicks')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (smartLinkId) {
        query = query.eq('smart_link_id', smartLinkId);
      }

      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw error;

      const clicks = data || [];

      // Aggregate clicks by day
      const clicksByDayMap = new Map<string, number>();
      for (let i = days; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'dd/MM');
        clicksByDayMap.set(date, 0);
      }
      
      clicks.forEach((click) => {
        const date = format(new Date(click.created_at), 'dd/MM');
        clicksByDayMap.set(date, (clicksByDayMap.get(date) || 0) + 1);
      });

      const clicksByDay: ClicksByDay[] = Array.from(clicksByDayMap.entries()).map(
        ([date, count]) => ({ date, clicks: count })
      );

      // Aggregate clicks by device
      const clicksByDeviceMap = new Map<string, number>();
      clicks.forEach((click) => {
        const device = click.device_type || 'Desconhecido';
        clicksByDeviceMap.set(device, (clicksByDeviceMap.get(device) || 0) + 1);
      });

      const clicksByDevice: ClicksByDevice[] = Array.from(clicksByDeviceMap.entries())
        .map(([device, count]) => ({ device, clicks: count }))
        .sort((a, b) => b.clicks - a.clicks);

      // Aggregate clicks by referrer
      const clicksByReferrerMap = new Map<string, number>();
      clicks.forEach((click) => {
        let referrer = click.referrer || 'Direto';
        
        // Simplify referrer URL to domain
        if (referrer !== 'Direto') {
          try {
            const url = new URL(referrer);
            referrer = url.hostname.replace('www.', '');
          } catch {
            referrer = 'Outro';
          }
        }
        
        clicksByReferrerMap.set(referrer, (clicksByReferrerMap.get(referrer) || 0) + 1);
      });

      const clicksByReferrer: ClicksByReferrer[] = Array.from(clicksByReferrerMap.entries())
        .map(([referrer, count]) => ({ referrer, clicks: count }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10); // Top 10 referrers

      return {
        totalClicks: clicks.length,
        clicksByDay,
        clicksByDevice,
        clicksByReferrer,
      };
    },
  });
}

export function useAllSmartLinksAnalytics(days: number = 30) {
  return useSmartLinkAnalytics(undefined, days);
}
