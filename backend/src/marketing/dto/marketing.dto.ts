import { IsString, IsNotEmpty, IsOptional, IsIn, IsArray } from 'class-validator';

export class WhatsAppMarketingCampaignDto {
  @IsString()
  @IsNotEmpty()
  campaignName: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([
    'festival_wishes_v1',
    'welcome_message_v1',
    'package_expiry_v1',
    'promotional_offer_v1',
    'biodata_share_v1',
  ])
  templateId: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['ALL_MEMBERS', 'UNVERIFIED_MEMBERS', 'EXPIRED_MEMBERS', 'FREE_MEMBERS', 'ACTIVE_MEMBERS'])
  targetAudience: 'ALL_MEMBERS' | 'UNVERIFIED_MEMBERS' | 'EXPIRED_MEMBERS' | 'FREE_MEMBERS' | 'ACTIVE_MEMBERS';

  @IsOptional()
  @IsString()
  customMessage?: string;

  @IsOptional()
  @IsArray()
  templateParams?: string[];
}
