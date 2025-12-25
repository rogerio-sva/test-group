import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CampaignClickStats {
  total_clicks: number;
  clicks_today: number;
  clicks_last_7_days: number;
  top_groups: Array<{
    group_phone: string;
    group_name: string;
    click_count: number;
  }>;
}

export function useCampaignClickStats(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-click-stats', campaignId],
    queryFn: async (): Promise<CampaignClickStats> => {
      const { data: smartLinks, error: linksError } = await supabase
        .from('smart_links')
        .select('id')
        .eq('campaign_id', campaignId);

      if (linksError) throw linksError;

      if (!smartLinks || smartLinks.length === 0) {
        return {
          total_clicks: 0,
          clicks_today: 0,
          clicks_last_7_days: 0,
          top_groups: [],
        };
      }

      const linkIds = smartLinks.map(link => link.id);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const [totalResult, todayResult, weekResult, topGroupsResult] = await Promise.all([
        supabase
          .from('smart_link_clicks')
          .select('*', { count: 'exact', head: true })
          .in('smart_link_id', linkIds),

        supabase
          .from('smart_link_clicks')
          .select('*', { count: 'exact', head: true })
          .in('smart_link_id', linkIds)
          .gte('created_at', today.toISOString()),

        supabase
          .from('smart_link_clicks')
          .select('*', { count: 'exact', head: true })
          .in('smart_link_id', linkIds)
          .gte('created_at', sevenDaysAgo.toISOString()),

        supabase
          .from('smart_link_clicks')
          .select('redirected_to_group')
          .in('smart_link_id', linkIds)
          .not('redirected_to_group', 'is', null),
      ]);

      const clicksByGroup = new Map<string, number>();
      topGroupsResult.data?.forEach(click => {
        const group = click.redirected_to_group;
        if (group) {
          clicksByGroup.set(group, (clicksByGroup.get(group) || 0) + 1);
        }
      });

      const { data: groups } = await supabase
        .from('campaign_groups')
        .select('group_phone, group_name')
        .eq('campaign_id', campaignId);

      const groupMap = new Map(
        groups?.map(g => [g.group_phone, g.group_name]) || []
      );

      const topGroups = Array.from(clicksByGroup.entries())
        .map(([phone, count]) => ({
          group_phone: phone,
          group_name: groupMap.get(phone) || phone,
          click_count: count,
        }))
        .sort((a, b) => b.click_count - a.click_count)
        .slice(0, 5);

      return {
        total_clicks: totalResult.count || 0,
        clicks_today: todayResult.count || 0,
        clicks_last_7_days: weekResult.count || 0,
        top_groups: topGroups,
      };
    },
    refetchInterval: 60000,
  });
}
