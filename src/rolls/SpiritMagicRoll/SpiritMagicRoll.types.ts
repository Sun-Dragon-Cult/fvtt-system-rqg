import EvaluationOptions = RollTerm.EvaluationOptions;
import type { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";

export type Modifier = { description: string; value: number };

export type SpiritMagicRollOptions = Partial<EvaluationOptions> & {
  powX5: number;
  levelUsed: number;
  magicPointBoost?: number;
  modifiers?: Modifier[];
  spellName?: string;
  spellImg?: string;
  useSpecialCriticals?: boolean;
  speaker?: ChatSpeakerDataProperties;
};
