import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgItem } from "../rqgItem";
import { RqgActor } from "../../actors/rqgActor";
import { assertItemType, localize, logMisconfiguration, mergeArraysById } from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { getLocationRelatedUpdates } from "../shared/physicalItemUtil";
import { Rqid } from "../../system/api/rqidApi";

export class Weapon extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", WeaponSheet, {
  //     types: [ItemTypeEnum.Weapon],
  //     makeDefault: true,
  //   });
  // }

  // Extract the `+db` or `+db/2` part of the damage string
  static damageBonusRegex = /\+[^+\-*/]*db(?<half>[^+\-*/]*\/[^+\-*/]*2)?/;

  // // TODO Remove and use future AttackRoll etc
  // static async toChat(weapon: RqgItem): Promise<void> {
  //   assertItemType(weapon.type, ItemTypeEnum.Weapon);
  //   const usage = Weapon.getDefaultUsage(weapon);
  //   // @ts-expect-error isEmpty
  //   if (foundry.utils.isEmpty(usage)) {
  //     return; // There is no way to use this weapon - it could be arrows for example
  //   }
  //   const flags: WeaponChatFlags = {
  //     type: "weaponChat",
  //     chat: {
  //       actorUuid: weapon.actor!.uuid,
  //       tokenUuid: weapon.actor!.token?.uuid,
  //       chatImage: weapon.img ?? undefined,
  //       weaponUuid: weapon.uuid,
  //       specialDamageTypeText: undefined,
  //       result: undefined,
  //     },
  //     formData: {
  //       otherModifiers: "",
  //       actionName: "",
  //       actionValue: "",
  //       combatManeuverName: "",
  //       usage: usage,
  //     },
  //   };
  //
  //   await ChatMessage.create(await WeaponChatHandler.renderContent(flags));
  // }
  // // All rolls in one for now, differentiate with actionName
  // // TODO create attackRoll - and use an AbilityRoll for Parry?
  // static async abilityRoll(
  //   weaponItem: RqgItem,
  //   options: {
  //     actionName: string;
  //     actionValue: string;
  //     otherModifiers: number;
  //     usageType: UsageType;
  //     chatMessage: RqgChatMessage;
  //   },
  // ): Promise<AbilitySuccessLevelEnum | undefined> {
  //   assertItemType(weaponItem.type, ItemTypeEnum.Weapon);
  //   requireValue(weaponItem.actor, "Called weapon abilityRoll with a not embedded weapon item");
  //   const speaker = ChatMessage.getSpeaker({ actor: weaponItem.actor ?? undefined });
  //
  //   switch (options.actionName) {
  //     case "combatManeuverRoll": {
  //       const weaponUsage = weaponItem.system.usage[options.usageType];
  //       const combatManeuver = weaponUsage.combatManeuvers.find(
  //         (m: CombatManeuver) => m.name === options.actionValue,
  //       );
  //       requireValue(
  //         combatManeuver,
  //         `Couldn't find combatmaneuver [${options.actionName}] and usage type [${options.usageType}] on weapon [${weaponItem.name}]`,
  //         weaponItem,
  //       );
  //       await Weapon.combatManeuverRoll(
  //         weaponItem,
  //         options.usageType,
  //         combatManeuver,
  //         options.chatMessage,
  //         // options.otherModifiers,
  //         // speaker,
  //       );
  //       return;
  //     }
  //
  //     case "damageRoll": {
  //       assertChatMessageFlagType(options.chatMessage.flags.rqg?.type, "weaponChat");
  //       const damageRollType = options.actionValue as DamageRollTypeEnum; // TODO improve typing
  //       await Weapon.damageRoll(
  //         weaponItem,
  //         options.usageType,
  //         convertFormValueToString(options.chatMessage.flags.rqg?.formData.combatManeuverName),
  //
  //         damageRollType,
  //         speaker,
  //       );
  //       return;
  //     }
  //
  //     case "hitLocationRoll": {
  //       await Weapon.hitLocationRoll(speaker);
  //       return;
  //     }
  //
  //     case "fumbleRoll": {
  //       await Weapon.fumbleRoll(weaponItem.actor);
  //       return;
  //     }
  //
  //     default: {
  //       const msg = localize("RQG.Dialog.weaponChat.UnknownButtonInChatError", {
  //         actionButton: options.actionName,
  //       });
  //       ui.notifications?.error(msg);
  //       throw new RqgError(msg, options.actionName);
  //     }
  //   }
  // }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static preUpdateItem(actor: RqgActor, weapon: RqgItem, updates: object[], options: any): void {
    if (weapon.type === ItemTypeEnum.Weapon) {
      mergeArraysById(updates, getLocationRelatedUpdates(actor.items.contents, weapon, updates));
    }
  }

  /*
   * Add the skills specified in the weapon to the actor (if not already there)
   * and connect the weapons with the embedded item skill id.
   */
  static async onEmbedItem(
    actor: RqgActor,
    child: RqgItem,
    options: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: string,
  ): Promise<any> {
    assertItemType(child.type, ItemTypeEnum.Weapon);

    const actorHasRightArm = !!actor.getBestEmbeddedDocumentByRqid("i.hit-location.right-arm");

    if (!child.system.isNatural && !actorHasRightArm) {
      // To be able to use a physical weapon you need an arm.
      // This prevents donkeys to get sword skills just because they carry swords.
      return {};
    }

    const succeeded = await Promise.all([
      Weapon.embedLinkedSkill(child.system.usage.oneHand.skillRqidLink.rqid, actor),
      Weapon.embedLinkedSkill(child.system.usage.offHand.skillRqidLink.rqid, actor),
      Weapon.embedLinkedSkill(child.system.usage.twoHand.skillRqidLink.rqid, actor),
      Weapon.embedLinkedSkill(child.system.usage.missile.skillRqidLink.rqid, actor),
    ]);
    if (succeeded.includes(false)) {
      // Didn't find one of the weapon skills - open the item sheet to let the user select one
      // TODO how to handle this?
      options.renderSheet = true;
    }
    // Thrown weapons should decrease quantity of themselves
    const projectileId = child.system.isThrownWeapon ? child.id : child.system.projectileId;

    return {
      _id: child.id,
      system: {
        projectileId: projectileId,
      },
    };
  }

  /**
   * Checks if the specified skill is already owned by the actor.
   * If not it embeds the referenced skill.
   * Returns false if the linked skill could not be found.
   */
  public static async embedLinkedSkill(skillRqid: string, actor: RqgActor): Promise<boolean> {
    if (!skillRqid) {
      return true; // No rqid (no linked skill) so count this as a success.
    }
    const embeddedSkill = actor.getBestEmbeddedDocumentByRqid(skillRqid);

    if (!embeddedSkill) {
      const skill = (await Rqid.fromRqid(skillRqid)) as RqgItem;
      if (!skill) {
        logMisconfiguration(
          localize("RQG.Item.Notification.CantFindWeaponSkillWarning"),
          true,
          skillRqid,
        );
        return false;
      }
      // @ts-expect-error skill
      await actor.createEmbeddedDocuments("Item", [skill]);
    }
    return true;
  }

  // static getDefaultUsage(weapon: RqgItem): UsageType {
  //   assertItemType(weapon.type, ItemTypeEnum.Weapon);
  //   const defaultUsage = weapon.system.defaultUsage;
  //   // @ts-expect-error isEmpty
  //   if (!foundry.utils.isEmpty(defaultUsage)) {
  //     return defaultUsage;
  //   }
  //   const options = WeaponChatHandler.getUsageTypeOptions(weapon);
  //   // Fallback to picking the first available
  //   return Object.keys(options)[0] as UsageType;
  // }

  // private static async combatManeuverRoll(
  //   weaponItem: RqgItem,
  //   usage: UsageType,
  //   combatManeuver: CombatManeuver,
  //   chatMessage: RqgChatMessage,
  //   // otherModifiers: number,
  //   // speaker: ChatSpeakerDataProperties,
  // ): Promise<void> {
  //   assertItemType(weaponItem.type, ItemTypeEnum.Weapon);
  //   requireValue(chatMessage, "No chat message provided for combarManeuverRoll");
  //   const damageType = combatManeuver?.damageType;
  //   const specialDamageTypeDescription =
  //     damageType === "special" ? combatManeuver?.description || undefined : undefined;
  //   const flags = chatMessage.flags.rqg;
  //   assertChatMessageFlagType(flags?.type, "weaponChat");
  //
  //   flags.chat.specialDamageTypeText =
  //     specialDamageTypeDescription ??
  //     CONFIG.RQG.combatManeuvers.get(combatManeuver?.name ?? "")?.specialDescriptionHtml;
  //
  //   const projectileItem = weaponItem.system.isProjectileWeapon
  //     ? weaponItem.actor?.items.get(weaponItem.system.projectileId)
  //     : weaponItem; // Thrown (or melee)
  //
  //   let originalAmmoQty: number = 0;
  //
  //   // Decrease quantity of linked projectile if shooting
  //   if (
  //     projectileItem?.type === ItemTypeEnum.Weapon &&
  //     projectileItem.system.quantity &&
  //     projectileItem.system.quantity > 0 &&
  //     usage === "missile" &&
  //     !["parry", "special"].includes(damageType ?? "")
  //   ) {
  //     originalAmmoQty = projectileItem.system.quantity;
  //     const updateData: DeepPartial<ItemDataSource> = {
  //       _id: projectileItem.id,
  //       system: { quantity: --projectileItem.system.quantity },
  //     };
  //     await weaponItem.actor?.updateEmbeddedDocuments("Item", [updateData]);
  //   }
  //
  //   if (usage === "missile" && !projectileItem) {
  //     ui.notifications?.warn(
  //       localize("RQG.Dialog.weaponChat.OutOfAmmoWarn", {
  //         projectileName: "---",
  //         combatManeuverName: combatManeuver?.name,
  //       }),
  //     );
  //     return;
  //   }
  //
  //   // Prevent using weapons with projectile quantity 0
  //   if (
  //     projectileItem?.type === ItemTypeEnum.Weapon &&
  //     projectileItem.system.quantity != null &&
  //     projectileItem.system.quantity <= 0
  //   ) {
  //     if (originalAmmoQty > 0) {
  //       ui.notifications?.warn(
  //         localize("RQG.Dialog.weaponChat.UsedLastOfAmmoWarn", {
  //           projectileName: projectileItem.name,
  //         }),
  //       );
  //     } else {
  //       ui.notifications?.warn(
  //         localize("RQG.Dialog.weaponChat.OutOfAmmoWarn", {
  //           projectileName: projectileItem.name,
  //           combatManeuverName: combatManeuver?.name,
  //         }),
  //       );
  //       return;
  //     }
  //   }
  //
  //   const skillItem = Weapon.getUsedSkillItem(weaponItem, usage);
  //   assertItemType(skillItem?.type, ItemTypeEnum.Skill);
  //
  //   // const chance: number = Number(skillItem.system.chance) || 0;
  //   // const damageTypeString = Weapon.getDamageTypeString(damageType, [combatManeuver]);
  //   // TODO this is a temporary workaround to display slash / impale etc before there is a proper AttackRoll
  //   // const resultMessages = new Map([
  //   //   [AbilitySuccessLevelEnum.HyperCritical, damageTypeString],
  //   //   [AbilitySuccessLevelEnum.SpecialCritical, damageTypeString],
  //   //   [AbilitySuccessLevelEnum.Critical, damageTypeString],
  //   //   [AbilitySuccessLevelEnum.Special, damageTypeString],
  //   //   [AbilitySuccessLevelEnum.Success, damageTypeString],
  //   //   [AbilitySuccessLevelEnum.Failure, damageTypeString],
  //   //   [AbilitySuccessLevelEnum.Fumble, damageTypeString],
  //   // ]);
  //
  //   // flags.chat.result = await skillItem._roll(
  //   //   chance,
  //   //   [{ description: "Other Modifiers", value: otherModifiers }],
  //   //   speaker,
  //   //   resultMessages,
  //   // );
  //   await skillItem?.checkExperience(flags.chat.result);
  //   const data = await WeaponChatHandler.renderContent(flags);
  //   await chatMessage.update(data);
  // }

  // private static async damageRoll(
  //   weaponItem: RqgItem,
  //   usageType: UsageType,
  //   combatManeuverName: string | undefined,
  //   damageRollType: DamageRollTypeEnum,
  //   speaker: ChatSpeakerDataProperties,
  // ): Promise<void> {
  //   requireValue(
  //     combatManeuverName,
  //     localize("RQG.Dialog.weaponChat.NoCombatManeuverInDamageRollError"),
  //   );
  //   assertItemType(weaponItem.type, ItemTypeEnum.Weapon);
  //
  //   const weaponUsage: Usage = weaponItem.system.usage[usageType];
  //   const weaponDamageTag = localize("RQG.Dialog.weaponChat.WeaponDamageTag");
  //   const weaponHasDamage = hasOwnProperty(weaponUsage, "damage");
  //
  //   const damageBonus = Weapon.getDamageBonusPart(weaponItem, weaponUsage); // Get the calculated +db from the damage
  //   const weaponDamageString = weaponUsage.damage.replace(Weapon.damageBonusRegex, ""); // Remove the +db
  //   const weaponDamage = weaponHasDamage
  //     ? Roll.parse(`(${weaponDamageString})[${weaponDamageTag}]`, {})
  //     : [];
  //
  //   const damageRollTerms =
  //     hasOwnProperty(weaponUsage, "damage") && weaponUsage.damage ? weaponDamage : []; // Don't add 0 damage rollTerm
  //
  //   const damageType = weaponUsage.combatManeuvers.find(
  //     (m: CombatManeuver) => m.name === combatManeuverName,
  //   )?.damageType;
  //   requireValue(
  //     damageType,
  //     localize("RQG.Dialog.weaponChat.WeaponDoesNotHaveCombatManeuverError"),
  //   );
  //
  //   if ([DamageRollTypeEnum.Special, DamageRollTypeEnum.MaxSpecial].includes(damageRollType)) {
  //     if (["slash", "impale"].includes(damageType)) {
  //       damageRollTerms.push(...Weapon.slashImpaleSpecialDamage(weaponDamageString, damageType));
  //     } else if (damageType === "crush") {
  //       damageRollTerms.push(
  //         ...(await Weapon.crushSpecialDamage(
  //           Weapon.getDamageBonusString(weaponItem, weaponUsage),
  //         )),
  //       );
  //     } else if (damageType === "parry") {
  //       // Parry will use crush if existing or slash/impale if not, will work unless some weapon has both crush & slash
  //       // No weapon in the core rulebook has that though
  //       const usedParryingDamageType = Weapon.getDamageTypeString(
  //         damageType,
  //         weaponUsage.combatManeuvers,
  //       );
  //       if (usedParryingDamageType === "crush") {
  //         damageRollTerms.push(
  //           ...(await Weapon.crushSpecialDamage(
  //             Weapon.getDamageBonusString(weaponItem, weaponUsage),
  //           )),
  //         );
  //       } else if (["slash", "impale"].includes(usedParryingDamageType)) {
  //         damageRollTerms.push(
  //           ...Weapon.slashImpaleSpecialDamage(
  //             weaponDamageString,
  //             usedParryingDamageType as DamageType,
  //           ),
  //         );
  //       } else {
  //         logMisconfiguration(
  //           localize("RQG.Dialog.weaponChat.WeaponDoesNotHaveCombatManeuverError", {
  //             weaponName: weaponItem.name,
  //           }),
  //           true,
  //         );
  //       }
  //     }
  //   }
  //   damageRollTerms.push(...damageBonus);
  //
  //   const maximise = damageRollType === DamageRollTypeEnum.MaxSpecial;
  //   const damageRollTermsWithPlusOperatorsInBetween = damageRollTerms.flatMap(
  //     (value, index, array) =>
  //     array.length - 1 !== index ? [value, new OperatorTerm({ operator: "+" })] : value,
  // );
  //
  // const roll = Roll.fromTerms(damageRollTermsWithPlusOperatorsInBetween);
  //   await roll.evaluate({
  //     maximize: maximise,
  //     async: true,
  //   });
  //   await roll.toMessage({
  //     speaker: speaker,
  //     type: CONST.CHAT_MESSAGE_STYLES.ROLL,
  //     flavor: `${localize("RQG.Dialog.weaponChat.Damage")}: ${Weapon.getDamageTypeString(
  //       damageType,
  //       weaponUsage.combatManeuvers,
  //     )}`,
  //   });
  // }

  // private static getDamageTypeString(
  //   damageType: DamageType,
  //   combatManeuvers: CombatManeuver[],
  // ): string {
  //   if (damageType === "parry") {
  //     if (combatManeuvers.some((cm) => cm.damageType === "crush")) {
  //       damageType = "crush";
  //     } else if (combatManeuvers.some((cm) => cm.damageType === "slash")) {
  //       damageType = "slash";
  //     } else if (combatManeuvers.some((cm) => cm.damageType === "impale")) {
  //       damageType = "impale";
  //     }
  //   }
  //   return damageType;
  // }

  // private static async hitLocationRoll(speaker: ChatSpeakerDataProperties) {
  //   const roll = new Roll("1d20");
  //   await roll.evaluate({ async: true });
  //   await roll.toMessage({
  //     speaker: speaker,
  //     type: CONST.CHAT_MESSAGE_STYLES.ROLL,
  //     flavor: localize("RQG.Dialog.weaponChat.HitLocationRollFlavor"),
  //   });
  // }

  // private static async fumbleRoll(actor: RqgActor) {
  //   const speaker = ChatMessage.getSpeaker({ actor: actor });
  //   const fumbleTableName = getGame().settings.get(systemId, "fumbleRollTable");
  //   const fumbleTable = getGame().tables?.getName(fumbleTableName);
  //   if (!fumbleTable) {
  //     logMisconfiguration(
  //       localize("RQG.Dialog.weaponChat.FumbleTableMissingWarn", {
  //         fumbleTableName: fumbleTableName,
  //       }),
  //       true,
  //     );
  //     return;
  //   }
  //   // @ts-expect-error TODO draw StoredDocument<RollTable>
  //   const draw = await fumbleTable.draw({ displayChat: false });
  //   // Construct chat data
  //   const numberOfResults =
  //     draw.results.length > 1
  //       ? localize("RQG.Dialog.weaponChat.PluralResults", { numberOfResults: draw.results.length })
  //       : localize("RQG.Dialog.weaponChat.SingularResult");
  //   const messageData: ChatMessageDataConstructorData = {
  //     flavor: localize("RQG.Dialog.weaponChat.DamageBonusDamageTag", {
  //       numberOfResults: numberOfResults,
  //       fumbleTableName: fumbleTableName,
  //     }),
  //     user: getGameUser().id,
  //     speaker: speaker,
  //     whisper: usersIdsThatOwnActor(actor),
  //     type: CONST.CHAT_MESSAGE_STYLES.ROLL,
  //     roll: draw.roll,
  //     sound: draw.roll ? CONFIG.sounds.dice : null,
  //     flags: { "core.RollTable": fumbleTable.id },
  //   };
  //
  //   // Render the chat message which combines the dice roll with the drawn results
  //   messageData.content = await renderTemplate(CONFIG.RollTable.resultTemplate, {
  //     //@ts-expect-error description
  //     description: await TextEditor.enrichHTML(fumbleTable.description, {
  //       // @ts-expect-error documents
  //       documents: true,
  //       async: true,
  //     }),
  //     results: draw.results.map((r: any) => {
  //       // TODO fix typing
  //       r.text = r.getChatText();
  //       return r;
  //     }),
  //     // @ts-expect-errors displayRoll
  //     rollHTML: fumbleTable.displayRoll ? await draw.roll.render() : null,
  //     table: fumbleTable,
  //   });
  //
  //   // Create the chat message
  //   await ChatMessage.create(messageData);
  // }

  // private static async crushSpecialDamage(damageBonus: string): Promise<any[]> {
  //   if (damageBonus.length) {
  //     const specialDamage = Roll.parse(damageBonus, {});
  //     const roll = Roll.fromTerms(specialDamage);
  //     await roll.evaluate({ maximize: true, async: true });
  //     const crushSpecialDamageTag = localize("RQG.Dialog.weaponChat.CrushSpecialDamageTag");
  //     return Roll.parse(`${roll.result}[${crushSpecialDamageTag}]`, {});
  //   }
  //   return [];
  // }

  // private static slashImpaleSpecialDamage(weaponDamage: string, damageType: DamageType): any[] {
  //   const specialDamageTag =
  //     damageType === "impale"
  //       ? localize("RQG.Dialog.weaponChat.ImpaleSpecialDamageTag")
  //       : localize("RQG.Dialog.weaponChat.SlashSpecialDamageTag");
  //   return Roll.parse(`(${weaponDamage})[${specialDamageTag}]`, {});
  // }

  // public static getUsedSkillItem(weaponItem: RqgItem, usage: UsageType): RqgItem | undefined {
  //   assertItemType(weaponItem.type, ItemTypeEnum.Weapon);
  //   return weaponItem.actor?.getBestEmbeddedDocumentByRqid(
  //     weaponItem.system.usage[usage]?.skillRqidLink?.rqid,
  //   );
  // }

  // private static getDamageBonusPart(weaponItem: RqgItem, usage: Usage): RollTerm[] {
  //   const damageBonusFormula = Weapon.getDamageBonusString(weaponItem, usage);
  //
  //   if (damageBonusFormula.length === 0) {
  //     return [];
  //   }
  //
  //   const damageBonusDamageTag = localize("RQG.Dialog.weaponChat.DamageBonusDamageTag");
  //   return Roll.parse(`${damageBonusFormula}[${damageBonusDamageTag}]`, {});
  // }

  // private static getDamageBonusString(weaponItem: RqgItem, usage: Usage): string {
  //   const dbMatch = usage.damage.match(Weapon.damageBonusRegex);
  //
  //   const hasDamageBonus = !!dbMatch;
  //   if (!hasDamageBonus) {
  //     return "";
  //   }
  //
  //   const actorDb = weaponItem.actor?.system.attributes.damageBonus || "0";
  //   const halfDb = !!dbMatch?.groups?.half;
  //
  //   if (weaponItem.actor?.system.attributes.damageBonus === "0") {
  //     return "";
  //   }
  //
  //   if (halfDb) {
  //     return `ceil(${actorDb}/2)`;
  //   } else {
  //     return actorDb;
  //   }
  // }
}
