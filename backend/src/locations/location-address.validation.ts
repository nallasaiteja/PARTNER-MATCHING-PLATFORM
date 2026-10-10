import { BadRequestException } from '@nestjs/common';
import { LocationLevel } from '@prisma/client';

type LocationRecord = {
  id: string;
  name: string;
  level: LocationLevel;
  parentId: string | null;
  isActive: boolean;
};

type AddressSelection = {
  country?: string;
  countryId?: string;
  state?: string;
  stateId?: string;
  district?: string;
  districtId?: string;
  mandal?: string;
  mandalId?: string;
  village?: string;
  villageId?: string;
};

const findSelection = (
  locations: LocationRecord[],
  level: LocationLevel,
  value: string,
  parentId: string | null,
  id?: string,
) => locations.find((location) =>
  location.isActive &&
  location.level === level &&
  location.parentId === parentId &&
  (id ? location.id === id : location.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase()) &&
  location.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
);

export function validateStep1Address(
  address: AddressSelection,
  locations: LocationRecord[],
): void {
  const countryName = address.country?.trim() || '';
  const stateName = address.state?.trim() || '';
  if (!countryName) throw new BadRequestException('Country is required');
  if (!stateName) throw new BadRequestException('State is required');

  const country = findSelection(locations, LocationLevel.COUNTRY, countryName, null, address.countryId);
  if (!country) throw new BadRequestException('Select a valid country');

  const state = findSelection(locations, LocationLevel.STATE, stateName, country.id, address.stateId);
  if (!state) throw new BadRequestException('State must belong to the selected country');

  let district: LocationRecord | undefined;
  if (address.district?.trim()) {
    district = findSelection(locations, LocationLevel.DISTRICT, address.district, state.id, address.districtId);
    if (!district) throw new BadRequestException('District must belong to the selected state');
  }

  let mandal: LocationRecord | undefined;
  if (address.mandal?.trim()) {
    if (!district) throw new BadRequestException('Select a district before selecting a mandal');
    mandal = findSelection(locations, LocationLevel.MANDAL, address.mandal, district.id, address.mandalId);
    if (!mandal) throw new BadRequestException('Mandal must belong to the selected district');
  }

  if (address.villageId) {
    if (!mandal) throw new BadRequestException('Select a mandal before choosing a village');
    const village = findSelection(locations, LocationLevel.VILLAGE, address.village || '', mandal.id, address.villageId);
    if (!village) throw new BadRequestException('Village must belong to the selected mandal');
  }
}