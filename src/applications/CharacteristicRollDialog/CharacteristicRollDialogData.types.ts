export type CharacteristicRollDialogHandlebarsData = {
  characteristicName: string | null;
  characteristicValue: number;

  object: CharacteristicRollDialogObjectData;
  options: FormApplication.Options;
  title: string;
  augmentOptions: Record<string, string>; // TODO Actually <number, string>
  meditateOptions: Record<string, string>; // TODO Actually <number, string>
  difficultyOptions: Record<string, string>; // TODO Actually <number, string>
  totalChance: number;
};

export type CharacteristicRollDialogObjectData = {
  difficulty: number;
  augmentModifier: string;
  meditateModifier: string;
  otherModifier: string;
  otherModifierDescription: string;
};
