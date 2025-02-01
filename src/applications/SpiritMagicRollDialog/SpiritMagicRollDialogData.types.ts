export type SpiritMagicRollDialogHandlebarsData = {
  spellName: string | null;
  spellSignature: string;
  spellImg: string | null;
  powX5: number;
  isVariable: boolean;

  object: SpiritMagicRollDialogObjectData;
  options: FormApplication.Options;
  title: string;
  augmentOptions: Record<string, string>; // TODO Actually <number, string>
  meditateOptions: Record<string, string>; // TODO Actually <number, string>
  totalChance: number;
};

export type SpiritMagicRollDialogObjectData = {
  levelUsed: number;
  boost: number;
  augmentModifier: string;
  meditateModifier: string;
  otherModifier: string;
  otherModifierDescription: string;
};
