export enum DamageRollTypeEnum {
  Normal = "normal",
  Special = "special",
  MaxSpecial = "maxSpecial",
}

export class WeaponChatHandler {
  // /**
  //  * Do a roll from the Weapon Chat message. Use the flags on the chatMessage to get the required data.
  //  * Called from {@link RqgChatMessage.doRoll}
  //  */
  // public static async rollFromChat(chatMessage: RqgChatMessage): Promise<void> {
  //   const flags = chatMessage.flags.rqg;
  //   assertChatMessageFlagType(flags?.type, "weaponChat");
  //   const weaponItem = (await getRequiredDocumentFromUuid(flags.chat.weaponUuid)) as
  //     | RqgItem
  //     | undefined;
  //   assertItemType(weaponItem?.type, ItemTypeEnum.Weapon);
  //
  //   // TODO don't roll from chat,. roll from dialog
  //   // const { otherModifiers, actionName, actionValue, usageType } =
  //   //   await WeaponChatHandler.getFormDataFromFlags(flags);
  //   //
  //   // await weaponItem?.abilityRoll({
  //   //   actionName,
  //   //   actionValue,
  //   //   otherModifiers,
  //   //   usageType,
  //   //   chatMessage,
  //   // });
  // }
  //
  // public static async renderContent(
  //   flags: RqgChatMessageFlags,
  // ): Promise<ChatMessageDataConstructorData> {
  //   assertChatMessageFlagType(flags.type, "weaponChat");
  //   const actor = await getRequiredRqgActorFromUuid<RqgActor>(flags.chat.actorUuid);
  //   const token = await getDocumentFromUuid<TokenDocument>(flags.chat.tokenUuid);
  //   const weaponItem = await getRequiredDocumentFromUuid<RqgItem>(flags.chat.weaponUuid);
  //   const { otherModifiers, usageType } = await WeaponChatHandler.getFormDataFromFlags(flags);
  //   const skillItem = Weapon.getUsedSkillItem(weaponItem, usageType);
  //   assertItemType(skillItem?.type, ItemTypeEnum.Skill);
  //
  //   const specialization = skillItem.system.specialization
  //     ? ` (${skillItem.system.specialization})`
  //     : "";
  //   const chatHeading = localize("RQG.Dialog.weaponChat.WeaponChatFlavor", {
  //     weaponName: weaponItem.name,
  //   });
  //   const usageOptions = WeaponChatHandler.getUsageTypeOptions(weaponItem);
  //   const templateData = {
  //     ...flags,
  //     skillItemData: skillItem.system,
  //     weaponItemData: weaponItem.system,
  //     chatHeading: chatHeading,
  //     chance: skillItem.system.chance + otherModifiers,
  //     usageOptions: usageOptions,
  //     hideUsageOptions: Object.keys(usageOptions).length === 1,
  //   };
  //   const html = await renderTemplate(templatePaths.chatWeaponHandler, templateData);
  //
  //   return {
  //     flavor: "Skill:" + skillItem.system.skillName + specialization, // TODO Translate (or rethink)
  //     user: getGameUser().id,
  //     speaker: ChatMessage.getSpeaker({ actor: actor, token: token }),
  //     content: html,
  //     whisper: usersIdsThatOwnActor(actor),
  //     type: CONST.CHAT_MESSAGE_STYLES.WHISPER,
  //     flags: {
  //       core: { canPopout: true },
  //       rqg: flags,
  //     },
  //   };
  // }
  //
  // public static async getFormDataFromFlags(flags: RqgChatMessageFlags): Promise<{
  //   actionValue: string;
  //   usageType: UsageType;
  //   otherModifiers: number;
  //   actionName: string;
  // }> {
  //   assertChatMessageFlagType(flags.type, "weaponChat");
  //   const actionName = convertFormValueToString(flags.formData.actionName);
  //   const actionValue = convertFormValueToString(flags.formData.actionValue);
  //   const otherModifiers = convertFormValueToInteger(flags.formData.otherModifiers);
  //   const usage = convertFormValueToString(flags.formData.usage) as UsageType;
  //   return {
  //     otherModifiers: otherModifiers,
  //     actionName: actionName,
  //     actionValue: actionValue,
  //     usageType: usage,
  //   };
  // }
  //
  // /**
  //  * Store the current raw string (FormDataEntryValue) form values to the flags
  //  * Called from {@link RqgChatMessage.formSubmitHandler} and {@link RqgChatMessage.inputChangeHandler}
  //  */
  // public static updateFlagsFromForm(
  //   flags: RqgChatMessageFlags,
  //   ev: SubmitEvent | InputEvent | Event,
  // ): void {
  //   assertChatMessageFlagType(flags.type, "weaponChat");
  //   const target = ev.target;
  //   assertHtmlElement(target);
  //   const form = target?.closest<HTMLFormElement>("form") ?? undefined;
  //   const formData = new FormData(form);
  //
  //   // combatManeuverName (on the buttons) is not included in the formdata. Get it from what button caused the form to be submitted instead.
  //   if (ev instanceof SubmitEvent && ev.submitter instanceof HTMLButtonElement) {
  //     const pushedButton = ev.submitter;
  //     flags.formData.actionName = pushedButton.name;
  //     flags.formData.actionValue = pushedButton.value;
  //     if (pushedButton.name === "combatManeuverRoll") {
  //       flags.formData.combatManeuverName = pushedButton.value;
  //     }
  //   }
  //   flags.formData.usage = formData.get("usage") ?? "";
  //   flags.formData.otherModifiers = cleanIntegerString(formData.get("otherModifiers"));
  //
  //   // Initiate an update of the embedded weapon defaultUsage to store the preferred usage for next attack
  //   fromUuid(flags.chat.weaponUuid).then((weapon: any) => {
  //     weapon?.actor?.updateEmbeddedDocuments("Item", [
  //       { _id: weapon.id, system: { defaultUsage: flags.formData.usage } },
  //     ]);
  //   });
  // }
  //
  // static getUsageTypeOptions(weapon: RqgItem): object {
  //   assertItemType(weapon.type, ItemTypeEnum.Weapon);
  //   return Object.entries<Usage>(weapon.system.usage).reduce((acc: any, [key, usage]) => {
  //     if (usage?.skillRqidLink?.rqid) {
  //       acc[key] = localize(`RQG.Game.WeaponUsage.${key}-full`);
  //     }
  //     return acc;
  //   }, {});
  // }
}
