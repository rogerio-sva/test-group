import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCampaigns } from '@/hooks/use-campaigns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface CampaignSelectorProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  label?: string;
  placeholder?: string;
  allowNone?: boolean;
  showActiveOnly?: boolean;
  className?: string;
}

export function CampaignSelector({
  value,
  onValueChange,
  label = 'Campaign',
  placeholder = 'Select a campaign',
  allowNone = true,
  showActiveOnly = false,
  className,
}: CampaignSelectorProps) {
  const { data: campaigns, isLoading } = useCampaigns();

  const filteredCampaigns = showActiveOnly
    ? campaigns?.filter((c) => c.is_active)
    : campaigns;

  if (isLoading) {
    return (
      <div className={className}>
        {label && <Label>{label}</Label>}
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <Select
        value={value || 'none'}
        onValueChange={(v) => onValueChange(v === 'none' ? undefined : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value="none">No Campaign</SelectItem>}
          {filteredCampaigns && filteredCampaigns.length > 0 ? (
            filteredCampaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                <div className="flex items-center gap-2">
                  <span>{campaign.name}</span>
                  {!campaign.is_active && (
                    <Badge variant="secondary" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-campaigns" disabled>
              No campaigns available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
