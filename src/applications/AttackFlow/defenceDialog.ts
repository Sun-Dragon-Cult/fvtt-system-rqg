import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { AbilityRoll } from "../../rolls/AbilityRoll/AbilityRoll";
import { AbilityRollOptions } from "../../rolls/AbilityRoll/AbilityRoll.types";
import {
  assertItemType,
  getGame,
  getGameUser,
  localize,
  requireValue,
  RqgError,
  toKebabCase,
  trimChars,
} from "../../system/util";
import type { RqgActor } from "../../actors/rqgActor";
import type { RqgItem } from "../../items/rqgItem";
import { AttackDialogOptions, DefenceType } from "../../chat/RqgChatMessage.types";
import { DefenceDialogHandlebarsData, DefenceDialogObjectData } from "./DefenceDialogData.types";
import { RqgChatMessage } from "../../chat/RqgChatMessage";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { Usage, UsageType } from "../../data-model/item-data/weaponData";
import { getBasicOutcomeDescription } from "../../chat/attackFlowHandlers";
import { socketSend } from "../../sockets/RqgSocket";
import { combatOutcome, getDamageDegree } from "../../system/combatCalculations";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";

export class DefenceDialog extends FormApplication<
  FormApplication.Options,
  DefenceDialogHandlebarsData,
  DefenceDialogObjectData
> {
  private augmentOptions = {
    "0": "RQG.Dialog.Common.AugmentOptions.None",
    "50": "RQG.Dialog.Common.AugmentOptions.CriticalSuccess",
    "30": "RQG.Dialog.Common.AugmentOptions.SpecialSuccess",
    "20": "RQG.Dialog.Common.AugmentOptions.Success",
    "-20": "RQG.Dialog.Common.AugmentOptions.Failure",
    "-50": "RQG.Dialog.Common.AugmentOptions.Fumble",
  };

  private subsequentDefendOptions = {
    "0": "RQG.Dialog.Defence.SubsequentDefendOptions.First",
    "-20": "RQG.Dialog.Defence.SubsequentDefendOptions.Second",
    "-40": "RQG.Dialog.Defence.SubsequentDefendOptions.Third",
    "-60": "RQG.Dialog.Defence.SubsequentDefendOptions.Fourth",
    "-80": "RQG.Dialog.Defence.SubsequentDefendOptions.Fifth",
    "-100": "RQG.Dialog.Defence.SubsequentDefendOptions.Sixth",
  };

  private readonly attackingWeaponItem: RqgItem;
  private readonly attackChatMessage: RqgChatMessage | undefined;

  constructor(attackingWeaponItem: RqgItem, options: Partial<AttackDialogOptions> = {}) {
    const formData: DefenceDialogObjectData = {
      defendingActorUuid: undefined,
      parryingWeaponUuid: undefined,
      parryingWeaponUsage: undefined,
      defence: options.defenceType,
      defenceItemUuid: undefined,
      augmentModifier: "0",
      subsequentDefendModifier: "0",
      otherModifier: "0",
      otherModifierDescription: localize("RQG.Dialog.Defence.OtherModifier"),
    };

    super(formData, options as any);
    this.attackingWeaponItem = attackingWeaponItem;
    this.object = formData;

    const o = this.options as unknown as AttackDialogOptions;
    this.attackChatMessage = getGame().messages?.get(o.chatMessageId) as RqgChatMessage | undefined;
    if (!this.attackChatMessage) {
      ui.notifications?.error("Could not find chat message"); // TODO Improve error
    }
    this.object.defendingActorUuid = this.attackChatMessage?.flags?.rqg?.chat?.defendingActorUuid;
  }

  get id() {
    return `${this.constructor.name}-${trimChars(
      toKebabCase(this.attackingWeaponItem.name ?? ""),
      "-",
    )}`;
  }

  static get defaultOptions(): FormApplication.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "form", "roll-dialog", "defence-dialog"],
      popOut: true,
      template: templatePaths.defenceDialog,
      width: 500,
      left: 35,
      top: 15,
      title: "RQG.Dialog.Defence.Title",
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
    });
  }

  async getData(): Promise<DefenceDialogHandlebarsData> {
    // const defenceWeaponOptions = this.getDefenceWeaponOptions(this.object.actor);
    const actorOptions = this.getActorOptions();
    const defendingActor = (await fromUuid(
      this.object.defendingActorUuid ?? "",
    )) as RqgActor | null;

    // TODO can probably be simplify a bit
    const parryingWeaponOptions = this.getParryingWeaponOptions(defendingActor);
    const selectedParryingWeapon = (await fromUuid(
      this.object.parryingWeaponUuid ?? "",
    )) as RqgItem | null;
    const parryingWeaponUuid =
      selectedParryingWeapon?.uuid ?? Object.keys(parryingWeaponOptions)?.[0];
    const parryingWeapon =
      selectedParryingWeapon ?? ((await fromUuid(parryingWeaponUuid)) as RqgItem | null);
    const defenceOptions = this.getDefenceOptions(
      defendingActor ?? undefined,
      parryingWeapon?.uuid,
    );
    if (!Object.keys(defenceOptions).includes(this.object.defence ?? "")) {
      this.object.defence = Object.keys(defenceOptions)[0] as DefenceType; // Make sure there is a possible defence selected
    }

    // TODO should usage missile be excluded?
    const parryingWeaponUsageOptions = this.getParryingWeaponUsageOptions(parryingWeapon);
    const parryingWeaponUsageOptionKeys = Object.keys(parryingWeaponUsageOptions);
    if (
      !this.object.parryingWeaponUsage ||
      !parryingWeaponUsageOptionKeys.includes(this.object.parryingWeaponUsage)
    ) {
      this.object.parryingWeaponUsage = parryingWeaponUsageOptionKeys[0] as UsageType; // If nothing is selected, select the first option
    }
    const parrySkillRqid =
      parryingWeapon?.system.usage[this.object.parryingWeaponUsage]?.skillRqidLink?.rqid;

    const { defenceName, defenceChance } = this.getDefenceNameAndChance(
      this.object.defence,
      defendingActor,
      parrySkillRqid,
    );

    return {
      defenceName: defenceName,
      defenceChance: defenceChance,
      // abilityType: this.attackingWeaponItem.type,
      // abilityImg: parryingWeapon?.img ?? null, // TODO use it?
      object: this.object,
      options: this.options,
      title: this.title,
      augmentOptions: this.augmentOptions,
      subsequentDefendOptions: this.subsequentDefendOptions,
      defendingActorOptions: actorOptions,
      defenceOptions: defenceOptions,
      parryingWeaponOptions: parryingWeaponOptions,
      parryingWeaponUsageOptions: parryingWeaponUsageOptions,
      totalChance: Math.max(
        0,
        Number(defenceChance ?? 0) +
          Number(this.object.augmentModifier ?? 0) +
          Number(this.object.subsequentDefendModifier ?? 0) +
          Number(this.object.otherModifier ?? 0),
      ),
    };
  }

  activateListeners(html: JQuery): void {
    // Do the roll to chat
    html[0]?.querySelectorAll<HTMLElement>("[data-defend]").forEach((el) => {
      el.addEventListener("click", async () => {
        if (!this.attackChatMessage?.id) {
          const msg = "Attack chat message didn't have an id";
          throw new RqgError(msg, this.attackChatMessage);
        }

        // TODO duplicate code ***
        const selectedParryingWeapon = (await fromUuid(
          this.object.parryingWeaponUuid ?? "",
        )) as RqgItem | null;
        const parrySkillRqid =
          selectedParryingWeapon?.system.usage[this.object.parryingWeaponUsage ?? "oneHand"]
            ?.skillRqidLink?.rqid; // TODO hardcoded oneHand fallback usage
        // TODO end duplicate code ***

        const defendingActor = (await fromUuid(
          this.object.defendingActorUuid ?? "",
        )) as RqgActor | null;

        let defendSkillItem: RqgItem | undefined;
        switch (this.object.defence) {
          case "parry": {
            defendSkillItem = defendingActor?.getBestEmbeddedDocumentByRqid(parrySkillRqid) as
              | RqgItem
              | undefined;
            break;
          }

          case "dodge": {
            defendSkillItem = defendingActor?.getBestEmbeddedDocumentByRqid(
              CONFIG.RQG.skillRqid.dodge,
            );
            break;
          }

          case "ignore":
          default:
          // Leave defendSkillItem undefined
        }

        const defendRollOptions: AbilityRollOptions = {
          naturalSkill: defendSkillItem?.system.chance,
          modifiers: [
            {
              value: Number(this.object.augmentModifier),
              description: localize("RQG.Roll.AbilityRoll.Augment"),
            },
            {
              value: Number(this.object.subsequentDefendModifier),
              description: this.getSubsequestDefenceModifierLabel(
                Number(this.object.subsequentDefendModifier),
              ),
            },
            {
              value: Number(this.object.otherModifier),
              description: this.object.otherModifierDescription,
            },
          ],
          abilityName: defendSkillItem?.name ?? undefined, // TODO should it be defending weapon!?
          abilityType: defendSkillItem?.type ?? undefined,
          abilityImg: defendSkillItem?.img ?? undefined,
          speaker: ChatMessage.getSpeaker({
            actor: this.attackingWeaponItem.parent as RqgActor | undefined,
          }),
          // resultMessages?: Map<AbilitySuccessLevelEnum | undefined, string>; // TODO Idea - add fields in IAbility to specify text specific for an ability
        };
        const attackRoll = AbilityRoll.fromData(
          this.attackChatMessage?.getFlag(systemId, "chat.attackRoll") as any,
        );
        if (!attackRoll?.successLevel) {
          const msg = "Didn't find an attackRoll in the chatmessage, aborting";
          ui.notifications?.error(msg);
          console.error(`RQG | ${msg}`);
          return;
        }

        const defendRoll = new AbilityRoll("1d100", {}, defendRollOptions);
        await defendRoll.evaluate();
        if (!defendRoll.successLevel) {
          throw new RqgError("Evaluated AbilityRoll didn't give successLevel");
        }

        const attackingWeapon = (await fromUuid(
          this.attackChatMessage?.getFlag(systemId, "chat.attackWeaponUuid"),
        )) as RqgItem | null;
        assertItemType(attackingWeapon?.type, ItemTypeEnum.Weapon);

        const attackWeaponUsageType = this.attackChatMessage?.getFlag(
          systemId,
          "chat.attackWeaponUsage",
        );
        requireValue(
          attackWeaponUsageType,
          "No attacking weapon usage found in attack chat message",
        );

        const parryWeaponUsageType = this.object.parryingWeaponUsage;
        const attackDamageBonus =
          this.attackChatMessage?.flags?.rqg?.chat?.attackDamageBonus ?? "0";
        const defendDamageBonus = defendingActor?.system.attributes.damageBonus ?? "0";

        const {
          damageRoll,
          weaponDamage,
          damagedWeapon,
          defenderHitLocationDamage,
          useParryHitLocation,
          ignoreDefenderAp,
        } = await combatOutcome(
          this.object.defence,
          attackRoll,
          defendRoll,
          attackingWeapon,
          attackWeaponUsageType,
          attackDamageBonus,
          defendDamageBonus,
          selectedParryingWeapon,
          parryWeaponUsageType,
        );

        if (weaponDamage) {
          // TODO add damage to chatMessage for the applyDamage button - check if attacker or defender weapon
          console.log("*** Add damagedWeapon to chat", weaponDamage, damagedWeapon);
        }

        if (defenderHitLocationDamage) {
          // TODO add damage to chatMessage for the applyDamage button
          console.log(
            "*** Add hitLocation damage to chat",
            defenderHitLocationDamage,
            useParryHitLocation,
          );

          if (useParryHitLocation) {
            // TODO use the targets parry weapon hit location
            // TODO need to expand the weapon item or equipped system for this
          } else {
            // TODO use the target hitlocation according to the hitLocationRoll
          }
        }

        if (ignoreDefenderAp) {
          // TODO add damage to chatMessage for apply damage options
        }

        const messageData = this.attackChatMessage!.toObject();

        const defendRollHtml =
          (await defendRoll?.render()) ?? localize("RQG.Dialog.Defence.Ignored"); // TODO improve html

        const outcomeDescription = getBasicOutcomeDescription(
          this.object.defence,
          attackRoll.successLevel,
          defendRoll?.successLevel,
        );

        // TODO Introduce ability for GM to fudge roll here

        // Skip roll damage button if no damage occurred
        const attackState =
          getDamageDegree(
            this.object.defence ?? "ignore", // TODO correct?
            attackRoll.successLevel,
            defendRoll.successLevel,
          ) !== "none"
            ? "Defended"
            : "DamageRolled";

        const attackerFumbled = attackRoll.successLevel === AbilitySuccessLevelEnum.Fumble;
        const defenderFumbled = defendRoll?.successLevel === AbilitySuccessLevelEnum.Fumble;

        foundry.utils.mergeObject(
          messageData,
          {
            flags: {
              [systemId]: {
                chat: {
                  defenceWeaponUuid: selectedParryingWeapon?.uuid,
                  defenceWeaponUsage: parryWeaponUsageType,
                  outcomeDescription: outcomeDescription,
                  attackState: attackState,
                  defendRoll: defendRoll,
                  defendRollHtml: defendRollHtml,
                  attackerFumbled: attackerFumbled,
                  defenderFumbled: defenderFumbled,
                  actorDamagedApplied: attackState === "DamageRolled",
                  weaponDamageApplied: attackState === "DamageRolled",
                  weaponDamage: weaponDamage,
                  damageRoll: damageRoll,
                },
              },
            },
          },
          { overwrite: true },
        );

        messageData.content = await renderTemplate(
          templatePaths.attackChatMessage,
          messageData.flags[systemId]!.chat,
        );

        // @ts-expect-error author
        if (getGameUser().id === this.attackChatMessage.author.id) {
          await this.attackChatMessage.update(messageData);
        } else {
          socketSend({
            action: "updateChatMessage",
            messageId: this.attackChatMessage.id,
            update: messageData,
            // @ts-expect-error author
            messageAuthorId: this.attackChatMessage.author.id,
          });
        }

        await defendSkillItem?.checkExperience?.(defendRoll?.successLevel); // TODO move to later in flow
        await this.close();
      });
    });

    super.activateListeners(html);
  }

  async _updateObject(event: Event, formData: DefenceDialogObjectData): Promise<void> {
    this.object = formData;
    this.render(true);

    if (
      this.attackChatMessage?.getFlag(systemId, "chat.defendingActorUuid") !==
      this.object.defendingActorUuid
    ) {
      // Update the chat with who is defending
      const attackerName = (
        await fromUuid(this.attackChatMessage?.flags.rqg.chat.attackingActorUuid ?? "")
      )?.name;
      const defenderNameName = (await fromUuid(this.object.defendingActorUuid ?? ""))?.name;
      const flavor = localize("RQG.Dialog.Common.IsAttacking", {
        attackerName: `<b>${attackerName}</b>`,
        defenderName: `<b>${defenderNameName}</b>`,
      });
      await this.attackChatMessage?.update({
        flavor: flavor,
        "flags.rqg.chat.defendingActorUuid": this.object.defendingActorUuid,
      });
    }
  }

  private getDefenceNameAndChance(
    defence: string | undefined,
    defendingActor: RqgActor | null,
    parrySkillRqid: string,
  ): { defenceName: string; defenceChance: number } {
    if (defence === "parry") {
      const parryWeapon = defendingActor?.getBestEmbeddedDocumentByRqid(parrySkillRqid);
      return {
        defenceName: parryWeapon?.name ?? "",
        defenceChance: parryWeapon?.system.chance ?? 0,
      };
    }
    if (defence === "dodge") {
      const dodgeSkill = defendingActor?.getBestEmbeddedDocumentByRqid(CONFIG.RQG.skillRqid.dodge);
      return { defenceName: dodgeSkill?.name ?? "", defenceChance: dodgeSkill?.system.chance };
    }

    return { defenceName: localize("RQG.Dialog.Defence.Ignore"), defenceChance: 0 };
  }

  getSubsequestDefenceModifierLabel(defenceModifier: number): string {
    switch (defenceModifier) {
      case -20:
        return localize("RQG.Roll.AbilityRoll.SubsequentDefendRoll.Second");
      case -40:
        return localize("RQG.Roll.AbilityRoll.SubsequentDefendRoll.Third");
      case -60:
        return localize("RQG.Roll.AbilityRoll.SubsequentDefendRoll.Fourth");
      case -80:
        return localize("RQG.Roll.AbilityRoll.SubsequentDefendRoll.Fifth");
      case -100:
        return localize("RQG.Roll.AbilityRoll.SubsequentDefendRoll.Sixth");
      default:
        return "";
    }
  }
  private getActorOptions(): Record<string, string> {
    // case 1 - defendingActorUuid is set (attacker has set a target)
    // @ts-expect-error fromUuidSync
    const defendingActor = fromUuidSync(
      this.attackChatMessage?.flags[systemId]!.chat.defendingActorUuid ?? "",
    ) as RqgActor | null;
    if (defendingActor) {
      return { [defendingActor?.uuid ?? ""]: defendingActor.name ?? "" };
    }

    // case 2 - show a list of actors the user has access to
    return getGame()
      .actors?.filter((a) => a.isOwner)
      ?.reduce((acc: any, actor) => {
        acc[actor.uuid ?? ""] = actor.name;
        return acc;
      }, {});
  }

  private getDefenceOptions(
    defendingActor: RqgActor | undefined,
    parryingWeaponUuid: string | undefined,
  ): Record<DefenceType, string> {
    const defenceOptions: any = {};

    if (parryingWeaponUuid) {
      defenceOptions.parry = localize("RQG.Dialog.Defence.Parry");
    }

    const dodgeSkill = defendingActor?.getBestEmbeddedDocumentByRqid(CONFIG.RQG.skillRqid.dodge);
    if (dodgeSkill) {
      defenceOptions.dodge = dodgeSkill.name;
    }

    defenceOptions.ignore = localize("RQG.Dialog.Defence.Ignore");

    return defenceOptions;
  }

  private getParryingWeaponOptions(defendingActor: RqgActor | null): Record<string, string> {
    // get all weapons that can be used for parry
    const parryingWeapons =
      defendingActor?.items.filter(
        (i: RqgItem) =>
          i.type === ItemTypeEnum.Weapon &&
          i.system.equippedStatus === "equipped" &&
          (this.usageHasParryManeuver(i.system.usage.oneHand) ||
            this.usageHasParryManeuver(i.system.usage.offHand) ||
            this.usageHasParryManeuver(i.system.usage.twoHand) ||
            this.usageHasParryManeuver(i.system.usage.missile)),
      ) ?? [];
    const sortedWeapons = parryingWeapons.sort((a: any, b: any) => a.sort - b.sort);
    return sortedWeapons?.reduce((acc: any, weapon: RqgItem) => {
      acc[weapon.uuid ?? ""] = weapon.name;
      return acc;
    }, {});
  }

  private getParryingWeaponUsageOptions(
    parryingWeapon: RqgItem | null,
  ): Partial<Record<UsageType, string>> {
    const usages: Partial<Record<UsageType, string>> = {};

    if (!parryingWeapon) {
      const msg = "No parrying weapon selected";
      console.error("RQG | ", msg);
      return usages;
    }

    if (this.usageHasParryManeuver(parryingWeapon.system.usage.oneHand)) {
      usages.oneHand = "RQG.Game.WeaponUsage.oneHand-full";
    }

    if (this.usageHasParryManeuver(parryingWeapon.system.usage.offHand)) {
      usages.offHand = "RQG.Game.WeaponUsage.offHand-full";
    }

    if (this.usageHasParryManeuver(parryingWeapon.system.usage.twoHand)) {
      usages.twoHand = "RQG.Game.WeaponUsage.twoHand-full";
    }

    if (this.usageHasParryManeuver(parryingWeapon.system.usage.missile)) {
      usages.missile = "RQG.Game.WeaponUsage.missile-full";
    }

    return usages;
  }

  private usageHasParryManeuver(usage: Usage): boolean {
    return (
      usage.skillRqidLink?.rqid != null &&
      usage.combatManeuvers?.some((m) => m.damageType === "parry")
    );
  }
}
