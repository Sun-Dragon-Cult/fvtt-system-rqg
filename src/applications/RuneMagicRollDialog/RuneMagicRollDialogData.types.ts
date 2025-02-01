import type { RqgItem } from "../../items/rqgItem";

export type RuneMagicRollDialogHandlebarsData = {
  spell: RqgItem | undefined;
  usedRune: RqgItem | undefined;

  object: RuneMagicRollDialogObjectData;
  options: FormApplication.Options;
  title: string;
  eligibleRuneOptions: Record<string, string>;
  augmentOptions: Record<string, string>; // TODO Actually <number, string>
  meditateOptions: Record<string, string>; // TODO Actually <number, string>
  ritualOptions: Record<string, string>; // TODO Actually <number, string>
  totalChance: number;
};

export type RuneMagicRollDialogObjectData = {
  levelUsed: number;
  usedRuneId: string; // id of embedded rune
  boost: number;
  augmentModifier: string;
  meditateModifier: string;
  otherModifier: string;
  otherModifierDescription: string;
};
