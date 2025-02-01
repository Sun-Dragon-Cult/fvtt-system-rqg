import { ChatMessageType } from "../../chat/RqgChatMessage";
import { AttackState } from "../../chat/RqgChatMessage.types";
import { AbilityRoll } from "../../rolls/AbilityRoll/AbilityRoll";
import { UsageType } from "../item-data/weaponData";

export const documentRqidFlags = "documentRqidFlags" as const;
export const actorWizardFlags = "actorWizardFlags" as const;

export interface RqgItemFlags {
  [documentRqidFlags]: DocumentRqidFlags;
}

export interface RqgJournalEntryFlags {
  [documentRqidFlags]: DocumentRqidFlags;
}

export interface RqgRollTableFlags {
  [documentRqidFlags]: DocumentRqidFlags;
}

export interface RqgActorFlags {
  [documentRqidFlags]?: DocumentRqidFlags;
  [actorWizardFlags]?: {
    actorWizardComplete?: boolean;
    selectedSpeciesId?: string;
    selectedHomelandRqid?: string;
    isActorTemplate?: boolean;
    wizardChoices?: string;
  };
}

export interface DocumentRqidFlags {
  /** Defines what the document is. Example "i.skill.ride-bison" */
  /**
   * Defines the identity of a document (item, journal entry, ...).
   * The id is not unique, instead it is used to identify what the document is. It is made up of three parts
   * separated with a dot (.)
   * First parts is document type abbreviation {@link RQG_CONFIG} see rqid.prefixes
   * Second part is type inside the document, for example cult or skill. This can be empty for documents that
   * do not have types
   * Third part is the sluggified id given to the document.
   * Example `i.skill.ride-bison`or `je..rune-descriptions-air`
   */
  id?: string;
  /** Defines what language the document is written in. Example "en", "pl" */
  lang?: string;
  /** Defines how this rqid should be ranked compared to others with the same id. Higher number wins. */
  priority?: number;
}

// Base chat message flag structure
export type BaseRqgChatFlags = {
  /** The different types of chatmessages. Used for type narrowing, see {@link assertChatMessageFlagType} */
  type: ChatMessageType;
  /** Data that needs to be persisted. */
  chat: AttackChatFlags["chat"];
  // /** Data from inputs in the form only */
  // formData: object;
};

// // Flags common to all chatmessages
// export type CommonRqgChatFlags = {
//   /** The actor that is speaking / acting */
//   actorUuid: string;
//   /** The token that is speaking / acting */
//   tokenUuid: string | undefined;
//   /** An image url to represent what the chat message is about (often an item.img) */
//   chatImage: string | undefined;
// };

// export interface WeaponChatFlags extends BaseRqgChatFlags {
//   type: "weaponChat";
//   chat: CommonRqgChatFlags & {
//     weaponUuid: string;
//     result: AbilitySuccessLevelEnum | undefined;
//     specialDamageTypeText: string | undefined;
//   };
//   formData: {
//     otherModifiers: FormDataEntryValue;
//     usage: FormDataEntryValue;
//     combatManeuverName: FormDataEntryValue;
//     actionName: string; // the clicked buttons name (like "combatManeuver" or "damageRoll")
//     actionValue: string; // the clicked buttons value (like "slash" or "special")
//   };
// }

export interface AttackChatFlags extends BaseRqgChatFlags {
  type: "attackChat";
  // chat: CommonRqgChatFlags & {
  chat: {
    // *** Added in AttackDialog ***

    attackState: AttackState;
    attackingActorUuid: string;
    // Added by AttackDialog if target is set
    defendingActorUuid?: string;
    attackRoll: AbilityRoll;
    // TODO Is this really the best way?
    attackRollHtml: string;

    attackDamageBonus: string;

    actorDamagedApplied: boolean;
    weaponDamageApplied: boolean;

    attackWeaponUuid: string;
    attackWeaponUsage: UsageType;

    // *** Added in DefenceDialog ***

    defenceWeaponUuid?: string;
    defenceWeaponUsage?: UsageType;

    // TODO what about defending weapon db in case of parry

    /** Formatted text from attack or dodge result table */
    outcomeDescription: string;
    defendRoll?: AbilityRoll;
    // TODO Is this really the best way?
    defendRollHtml: string | undefined;
    attackerFumbled: boolean;
    defenderFumbled: boolean;

    /** Can be from either attacking or defending weapon */
    damageRoll?: Roll;
    /** Can be 1d20 or 1d10 or 1d10+10 - added in attackDialog, rolled by defenceDialog */
    hitLocationRoll?: Roll;

    damagedHitLocationUuid: string;
    damagedWeaponUuid: string;
    // result: AbilitySuccessLevelEnum | undefined;
    // specialDamageTypeText: string | undefined;
    // otherModifiers: FormDataEntryValue;
    // combatManeuverName: FormDataEntryValue;
    // actionName: string; // the clicked buttons name (like "combatManeuver" or "damageRoll")
    // actionValue: string; // the clicked buttons value (like "slash" or "special")

    attackerFumbleOutcome: string;
    defenderFumbleOutcome: string;
  };
}

export type RqgChatMessageFlags = AttackChatFlags;
