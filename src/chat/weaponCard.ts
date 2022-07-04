import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActor } from "../actors/rqgActor";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import {
  activateChatTab,
  assertActorType,
  assertChatMessageFlagType,
  assertItemType,
  cleanIntegerString,
  convertFormValueToInteger,
  convertFormValueToString,
  getDocumentFromUuid,
  getGame,
  getGameUser,
  getRequiredDocumentFromUuid,
  hasOwnProperty,
  localize,
  logMisconfiguration,
  requireValue,
  RqgError,
  usersIdsThatOwnActor,
} from "../system/util";

import { DeepPartial } from "snowpack";
import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { ChatMessageDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";
import { CombatManeuver, DamageType, UsageType } from "../data-model/item-data/weaponData";
import { RqgChatMessageFlags, WeaponCardFlags } from "../data-model/shared/rqgDocumentFlags";
import { RqgItem } from "../items/rqgItem";
import { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";

enum DamageRollTypeEnum {
  Normal = "normal",
  Special = "special",
  MaxSpecial = "maxSpecial",
}

export class WeaponCard {
  public static async show(
    weaponId: string,
    usage: UsageType,
    skillId: string,
    actor: RqgActor,
    token: TokenDocument | undefined
  ): Promise<void> {
    requireValue(actor.id, "No id on actor");
    const skillItem = actor.items.get(skillId);
    assertItemType(skillItem?.data.type, ItemTypeEnum.Skill);
    const weaponItem = actor.items.get(weaponId);
    assertItemType(weaponItem?.data.type, ItemTypeEnum.Weapon);

    const flags: WeaponCardFlags = {
      type: "weaponCard",
      card: {
        actorUuid: actor.uuid,
        tokenUuid: token?.uuid,
        chatImage: weaponItem.img ?? undefined,
        skillUuid: skillItem.uuid,
        weaponUuid: weaponItem.uuid,
        usage: usage,
        specialDamageTypeText: undefined,
        result: undefined,
      },
      formData: {
        otherModifiers: "",
        combatManeuverName: "",
      },
    };

    await ChatMessage.create(await WeaponCard.renderContent(flags));
    activateChatTab();
  }

  public static async formSubmitHandler(ev: SubmitEvent, messageId: string): Promise<boolean> {
    ev.preventDefault();

    const actionButton = ev.submitter as HTMLButtonElement;
    actionButton.disabled = true;
    setTimeout(() => (actionButton.disabled = false), 1000); // Prevent double clicks

    const chatMessage = getGame().messages?.get(messageId);
    requireValue(chatMessage, localize("RQG.Dialog.Common.CantFindChatMessageError"));

    const flags = chatMessage.data.flags.rqg;
    assertChatMessageFlagType(flags?.type, "weaponCard");

    const actor = await getRequiredDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.card.tokenUuid);
    const weaponItem = await getRequiredDocumentFromUuid<RqgItem>(flags.card.weaponUuid);
    assertItemType(weaponItem.data.type, ItemTypeEnum.Weapon);

    await WeaponCard.updateFlagsFromForm(flags, ev);
    const { combatManeuverName, otherModifiers } = await WeaponCard.getFormDataFromFlags(flags);

    switch (actionButton.name) {
      case "combatManeuverName":
        flags.formData.combatManeuverName = combatManeuverName;

        const weaponUsage = weaponItem.data.data.usage[flags.card.usage];
        const combatManeuver = weaponUsage.combatManeuvers.find(
          (m) => m.name === combatManeuverName
        );
        const damageType = combatManeuver?.damageType;
        const specialDamageTypeDescription =
          damageType === "special" ? combatManeuver?.description || undefined : undefined;

        flags.card.specialDamageTypeText =
          specialDamageTypeDescription ??
          CONFIG.RQG.combatManeuvers.get(combatManeuver?.name ?? "")?.specialDescriptionHtml;

        const projectileItemData =
          hasOwnProperty(weaponItem.data.data, "isProjectileWeapon") &&
          weaponItem.data.data.isProjectileWeapon
            ? actor.items.get(weaponItem.data.data.projectileId)?.data
            : weaponItem.data; // Thrown (or melee)

        let originalAmmoQty: number = 0;

        // Decrease quantity of linked projectile if shooting
        if (
          projectileItemData?.type === ItemTypeEnum.Weapon &&
          projectileItemData.data.quantity &&
          projectileItemData.data.quantity > 0 &&
          flags.card.usage === "missile" &&
          !["parry", "special"].includes(damageType ?? "")
        ) {
          originalAmmoQty = projectileItemData.data.quantity;
          const updateData: DeepPartial<ItemDataSource> = {
            _id: projectileItemData._id,
            data: { quantity: --projectileItemData.data.quantity },
          };
          await actor.updateEmbeddedDocuments("Item", [updateData]);
        }

        if (flags.card.usage === "missile" && !projectileItemData) {
          ui.notifications?.warn("Out of ammo!");
          return false;
        }

        // Prevent using weapons with projectile quantity 0
        if (
          projectileItemData?.type === ItemTypeEnum.Weapon &&
          projectileItemData.data.quantity != null &&
          projectileItemData.data.quantity <= 0
        ) {
          if (originalAmmoQty > 0) {
            ui.notifications?.warn(
              localize("RQG.Dialog.weaponCard.UsedLastOfAmmoWarn", {
                projectileName: projectileItemData.name,
              })
            );
          } else {
            ui.notifications?.warn(
              localize("RQG.Dialog.weaponCard.OutOfAmmoWarn", {
                projectileName: projectileItemData.name,
                combatManeuverName: combatManeuver?.name,
              })
            );
            return false;
          }
        }

        await WeaponCard.roll(
          weaponItem,
          flags.card.usage,
          actor,
          otherModifiers,
          ChatMessage.getSpeaker({ actor: actor, token: token }),
          chatMessage
        );
        return false;

      case "damageRoll":
        const damageRollType = (ev.submitter as HTMLButtonElement).value as
          | DamageRollTypeEnum
          | undefined;
        requireValue(damageRollType, "No damageRollType in event");
        const speaker = ChatMessage.getSpeaker({ actor: actor, token: token });
        await WeaponCard.damageRoll(
          actor,
          weaponItem,
          flags.card.usage,
          combatManeuverName,
          damageRollType,
          speaker
        );
        return false;

      case "hitLocationRoll":
        const roll = new Roll("1d20");
        await roll.evaluate({ async: true });
        await roll.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: actor, token: token }),
          type: CONST.CHAT_MESSAGE_TYPES.ROLL,
          flavor: localize("RQG.Dialog.weaponCard.HitLocationRollFlavor"),
        });
        return false;

      case "fumble":
        await WeaponCard.fumbleRoll(actor, ChatMessage.getSpeaker({ actor: actor, token: token }));
        return false;

      default:
        const msg = localize("RQG.Dialog.weaponCard.UnknownButtonInCardError", {
          actionButton: actionButton,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg, actionButton);
    }
  }

  public static async roll(
    weaponItem: RqgItem,
    usage: UsageType,
    actor: RqgActor,
    otherModifiers: number,
    speaker: ChatSpeakerDataProperties,
    chatMessage: ChatMessage // TODO how to get rid of this???
  ) {
    assertItemType(weaponItem.data.type, ItemTypeEnum.Weapon);
    assertActorType(actor?.data.type, ActorTypeEnum.Character);

    const skillItem = actor.getEmbeddedDocument(
      "Item",
      weaponItem.data.data.usage[usage].skillId
    ) as RqgItem | undefined;
    assertItemType(skillItem?.data.type, ItemTypeEnum.Skill);

    const chance: number = Number(skillItem.data.data.chance) || 0;

    const flags = chatMessage.data.flags.rqg;
    assertChatMessageFlagType(flags?.type, "weaponCard");

    flags.card.result = await Ability.roll(
      skillItem.name + " " + flags.formData.combatManeuverName,
      chance,
      otherModifiers,
      speaker
    );
    await WeaponCard.checkExperience(actor, skillItem, flags.card.result);

    const data = await WeaponCard.renderContent(flags);
    await chatMessage.update(data);
  }

  public static async checkExperience(
    actor: RqgActor,
    skillItem: RqgItem,
    result: ResultEnum
  ): Promise<void> {
    assertItemType(skillItem.data.type, ItemTypeEnum.Skill);
    if (result <= ResultEnum.Success) {
      actor.AwardExperience(skillItem.id);
    }
  }

  public static async renderContent(flags: RqgChatMessageFlags): Promise<object> {
    assertChatMessageFlagType(flags.type, "weaponCard");
    const actor = await getRequiredDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.card.tokenUuid);
    const skillItem = await getRequiredDocumentFromUuid<RqgItem>(flags.card.skillUuid);
    const weaponItem = await getRequiredDocumentFromUuid<RqgItem>(flags.card.weaponUuid);
    assertItemType(skillItem.data.type, ItemTypeEnum.Skill);

    const specialization = skillItem.data.data.specialization
      ? ` (${skillItem.data.data.specialization})`
      : "";
    const cardHeading = localize("RQG.Dialog.weaponCard.WeaponCardFlavor", {
      weaponName: weaponItem.name,
    });

    const { otherModifiers } = await WeaponCard.getFormDataFromFlags(flags);

    const templateData = {
      ...flags,
      skillItemData: skillItem.data.data,
      weaponItemData: weaponItem.data.data,
      cardHeading: cardHeading,
      chance: skillItem.data.data.chance + otherModifiers,
    };
    const html = await renderTemplate("systems/rqg/chat/weaponCard.hbs", templateData);

    return {
      flavor: "Skill:" + skillItem.data.data.skillName + specialization, // TODO Translate (or rethink)
      user: getGameUser().id,
      speaker: ChatMessage.getSpeaker({ actor: actor, token: token }),
      content: html,
      whisper: usersIdsThatOwnActor(actor),
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
        rqg: flags,
      },
    };
  }

  public static async getFormDataFromFlags(
    flags: RqgChatMessageFlags
  ): Promise<{ combatManeuverName: string; otherModifiers: number }> {
    assertChatMessageFlagType(flags.type, "weaponCard");
    const combatManeuverName = convertFormValueToString(flags.formData.combatManeuverName);
    const otherModifiers = convertFormValueToInteger(flags.formData.otherModifiers);
    return {
      otherModifiers: otherModifiers,
      combatManeuverName: combatManeuverName,
    };
  }

  // Store the current raw string (FormDataEntryValue) form values to the flags
  public static updateFlagsFromForm(
    flags: RqgChatMessageFlags,
    ev: SubmitEvent | InputEvent | Event
  ): void {
    assertChatMessageFlagType(flags.type, "weaponCard");
    const form = (ev.target as HTMLElement)?.closest<HTMLFormElement>("form") ?? undefined;
    const formData = new FormData(form);

    // combatManeuverName (on the buttons) is not included in the formdata. Get it from what button caused the form to be submitted instead.
    if (ev instanceof SubmitEvent) {
      const pushedButton = ev.submitter as HTMLButtonElement | undefined;
      if (pushedButton?.name === "combatManeuverName") {
        flags.formData.combatManeuverName = (ev.submitter as HTMLButtonElement)?.value;
      }
    }

    flags.formData.otherModifiers = cleanIntegerString(formData.get("otherModifiers"));
  }

  private static async damageRoll(
    actor: RqgActor,
    weaponItem: RqgItem,
    usageType: UsageType,
    combatManeuverName: string | undefined,
    damageRollType: DamageRollTypeEnum,
    speaker: ChatSpeakerDataProperties
  ): Promise<void> {
    requireValue(
      combatManeuverName,
      localize("RQG.Dialog.weaponCard.NoCombatManeuverInDamageRollError")
    );
    assertItemType(weaponItem.data.type, ItemTypeEnum.Weapon);
    let damageBonusFormula: string =
      actor.data.data.attributes.damageBonus !== "0"
        ? `${actor.data.data.attributes.damageBonus}`
        : "";

    const weaponUsage = weaponItem.data.data.usage[usageType];
    const weaponDamageTag = localize("RQG.Dialog.weaponCard.WeaponDamageTag");
    const weaponDamage = hasOwnProperty(weaponUsage, "damage")
      ? Roll.parse(`(${weaponUsage.damage})[${weaponDamageTag}]`, {})
      : [];

    if (usageType === "missile") {
      if (weaponItem.data.data.isThrownWeapon) {
        damageBonusFormula = "ceil(" + actor.data.data.attributes.damageBonus + "/2)";
      } else {
        damageBonusFormula = "";
      }
    }

    const damageRollTerms =
      hasOwnProperty(weaponUsage, "damage") && weaponUsage.damage ? weaponDamage : []; // Don't add 0 damage rollTerm

    const damageType = weaponUsage.combatManeuvers.find(
      (m) => m.name === combatManeuverName
    )?.damageType;
    requireValue(
      damageType,
      localize("RQG.Dialog.weaponCard.WeaponDoesNotHaveCombatManeuverError")
    );

    if ([DamageRollTypeEnum.Special, DamageRollTypeEnum.MaxSpecial].includes(damageRollType)) {
      if (["slash", "impale"].includes(damageType)) {
        damageRollTerms.push(...WeaponCard.slashImpaleSpecialDamage(weaponUsage.damage));
      } else if (damageType === "crush") {
        damageRollTerms.push(...(await WeaponCard.crushSpecialDamage(damageBonusFormula)));
      } else if (damageType === "parry") {
        // Parry will use crush if existing or slash/impale if not, will work unless some weapon has both crush & slash
        // No weapon in the core rulebook has that though
        const usedParryingDamageType = WeaponCard.getDamageTypeString(
          damageType,
          weaponUsage.combatManeuvers
        );
        if (usedParryingDamageType === "crush") {
          damageRollTerms.push(...(await WeaponCard.crushSpecialDamage(damageBonusFormula)));
        } else if (["slash", "impale"].includes(usedParryingDamageType)) {
          damageRollTerms.push(...WeaponCard.slashImpaleSpecialDamage(weaponUsage.damage));
        } else {
          logMisconfiguration(
            localize("RQG.Dialog.weaponCard.WeaponDoesNotHaveCombatManeuverError", {
              weaponName: weaponItem.name,
            }),
            true
          );
        }
      }
    }
    if (damageBonusFormula.length) {
      const damageBonusDamageTag = localize("RQG.Dialog.weaponCard.DamageBonusDamageTag");
      damageRollTerms.push(...Roll.parse(`+ ${damageBonusFormula}[${damageBonusDamageTag}]`, {}));
    }
    const maximise = damageRollType === DamageRollTypeEnum.MaxSpecial;
    const roll = Roll.fromTerms(damageRollTerms);
    await roll.evaluate({
      maximize: maximise,
      async: true,
    });
    await roll.toMessage({
      speaker: speaker,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      flavor: `${localize("RQG.Dialog.weaponCard.Damage")}: ${WeaponCard.getDamageTypeString(
        damageType,
        weaponUsage.combatManeuvers
      )}`,
    });
  }

  private static getDamageTypeString(
    damageType: DamageType,
    combatManeuvers: CombatManeuver[]
  ): string {
    if (damageType === "parry") {
      if (combatManeuvers.some((cm) => cm.damageType === "crush")) {
        damageType = "crush";
      } else if (combatManeuvers.some((cm) => cm.damageType === "slash")) {
        damageType = "slash";
      } else if (combatManeuvers.some((cm) => cm.damageType === "impale")) {
        damageType = "impale";
      }
    }
    return damageType;
  }

  private static async fumbleRoll(actor: RqgActor, speaker: ChatSpeakerDataProperties) {
    const fumbleTableName = getGame().settings.get("rqg", "fumbleRollTable");
    const fumbleTable = getGame().tables?.getName(fumbleTableName);
    if (!fumbleTable) {
      logMisconfiguration(
        localize("RQG.Dialog.weaponCard.FumbleTableMissingWarn", {
          fumbleTableName: fumbleTableName,
        }),
        true
      );
      return;
    }
    // @ts-ignore TODO draw StoredDocument<RollTable>
    const draw = await fumbleTable.draw({ displayChat: false });
    // Construct chat data
    const numberOfResults =
      draw.results.length > 1
        ? localize("RQG.Dialog.weaponCard.PluralResults", { numberOfResults: draw.results.length })
        : localize("RQG.Dialog.weaponCard.SingularResult");
    const messageData: ChatMessageDataConstructorData = {
      flavor: localize("RQG.Dialog.weaponCard.DamageBonusDamageTag", {
        numberOfResults: numberOfResults,
        fumbleTableName: fumbleTableName,
      }),
      user: getGameUser().id,
      speaker: speaker,
      whisper: usersIdsThatOwnActor(actor),
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: draw.roll,
      sound: draw.roll ? CONFIG.sounds.dice : null,
      flags: { "core.RollTable": fumbleTable.id },
    };

    // Render the chat card which combines the dice roll with the drawn results
    messageData.content = await renderTemplate(CONFIG.RollTable.resultTemplate, {
      // @ts-ignore entities TODO check definitions
      description: TextEditor.enrichHTML(fumbleTable.data.description, { entities: true }),
      results: draw.results.map((r: any) => {
        // TODO fix typing
        r.text = r.getChatText();
        return r;
      }),
      rollHTML: fumbleTable.data.displayRoll ? await draw.roll.render() : null,
      table: fumbleTable,
    });

    // Create the chat message
    await ChatMessage.create(messageData);
  }

  private static async crushSpecialDamage(damageBonus: string): Promise<any[]> {
    if (damageBonus.length) {
      const specialDamage = Roll.parse(damageBonus, {});
      const roll = Roll.fromTerms(specialDamage);
      await roll.evaluate({ maximize: true, async: true });
      const crushSpecialDamageTag = localize("RQG.Dialog.weaponCard.CrushSpecialDamageTag");
      return Roll.parse(`+ ${roll.result}[${crushSpecialDamageTag}]`, {});
    }
    return [];
  }

  private static slashImpaleSpecialDamage(weaponDamage: string): any[] {
    const impaleSpecialDamageTag = localize("RQG.Dialog.weaponCard.ImpaleSpecialDamageTag");
    return Roll.parse(`+ (${weaponDamage})[${impaleSpecialDamageTag}]`, {});
  }
}
