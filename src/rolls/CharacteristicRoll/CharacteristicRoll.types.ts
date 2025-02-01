import EvaluationOptions = RollTerm.EvaluationOptions;
import type { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";

export type Modifier = { description: string; value: number };

export type CharacteristicRollOptions = Partial<EvaluationOptions> & {
  characteristicValue: number;
  characteristicName: string; // Characteristic name TODO type better
  difficulty?: number; // to multiply with characteristicValue
  modifiers?: Modifier[];
  useSpecialCriticals?: boolean;
  speaker?: ChatSpeakerDataProperties;
};
