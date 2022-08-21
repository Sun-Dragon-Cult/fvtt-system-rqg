import { RqidLink } from "../shared/rqidLink";
import { ItemTypeEnum } from "./itemTypes";

export class FamilyHistoryEntry {
  beginYear: number | undefined;
  endYear: number | undefined;
  targetCharacter: string = "";
  rollTableRqidLink: RqidLink | undefined = undefined;
  modifiers: string = "";
}

export interface FamilyHistoryDataSourceData {
  homelandsRqidLinks: RqidLink[];
  familyHistoryEntries: FamilyHistoryEntry[];
}

// --- Derived Data ---
export interface FamilyHistoryDataPropertiesData extends FamilyHistoryDataSourceData {}

export interface FamilyHistoryDataSource {
  type: ItemTypeEnum.FamilyHistory;
  data: FamilyHistoryDataSourceData;
}

export interface FamilyHistoryDataProperties {
  type: ItemTypeEnum.FamilyHistory;
  data: FamilyHistoryDataSourceData;
}

export const defaultFamilyHistoryData: FamilyHistoryDataSourceData = {
  homelandsRqidLinks: [],
  familyHistoryEntries: [],
};
