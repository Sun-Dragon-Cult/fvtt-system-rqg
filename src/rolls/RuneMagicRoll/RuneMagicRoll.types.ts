import EvaluationOptions = RollTerm.EvaluationOptions;
import type { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import type { RqgItem } from "../../items/rqgItem";

export type Modifier = { description: string; value: number };

export type RuneMagicRollOptions = Partial<EvaluationOptions> & {
  usedRune: RqgItem;
  runeMagicItem: RqgItem;
  levelUsed: number;
  magicPointBoost: number;
  modifiers: Modifier[];
  useSpecialCriticals?: boolean;
  speaker: ChatSpeakerDataProperties;
};
