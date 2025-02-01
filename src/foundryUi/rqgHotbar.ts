import { localize } from "../system/util";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";

/**
 * The kind of macros that can be created by dropping a document onto the Hotbar.
 */
type MacroAction = "abilityRoll" | "rollTable" | "toggleSheet";

export class RqgHotbar extends Hotbar {
  static init() {
    CONFIG.ui.hotbar = RqgHotbar;
  }

  /**
   * Define the macros corresponding to each MacroAction type.
   */
  static macroActions = new Map<MacroAction, (doc: any) => string>([
    ["abilityRoll", (doc) => `const item = await fromUuid("${doc.uuid}"); item.abilityRoll();`],
    ["rollTable", (doc) => `(await fromUuid("${doc.uuid}")).draw()`],
    ["toggleSheet", (doc) => `Hotbar.toggleDocumentSheet("${doc.uuid}")`],
  ]);

  /**
   * Create a Macro document that with a macroAction depending on what document is dropped.
   *
   */
  async _createDocumentSheetToggle(doc: any): Promise<Macro> {
    const { command, name } = this.getMacroCommandAndName(doc);

    // @ts-expect-error create
    return Macro.implementation.create({
      name: name,
      type: CONST.MACRO_TYPES.SCRIPT,
      img: this.getMacroImg(doc),
      command: command,
    });
  }

  getMacroImg(doc: any): string | undefined {
    return doc.img || "icons/svg/book.svg";
  }

  getMacroCommandAndName(doc: any): { command: string | undefined; name: string } {
    // Item that can be sent to chat
    // if (
    //   doc.documentName === "Item" &&
    //   [
    //     ItemTypeEnum.RuneMagic,
    //     ItemTypeEnum.ShamanicAbility,
    //     ItemTypeEnum.SorceryMagic,
    //     ItemTypeEnum.SpiritMagic,
    //     ItemTypeEnum.Weapon,
    //   ].includes(doc.type)
    // ) {
    //   const actorName = doc?.parent?.prototypeToken?.name;
    //   const translationKey = actorName
    //     ? "RQG.Hotbar.MacroName.ToChatEmbedded"
    //     : "RQG.Hotbar.MacroName.ToChat";
    //   const name = localize(translationKey, { name: doc.name, actor: actorName });
    //   return { command: RqgHotbar.macroActions.get("toChat")?.(doc), name: name };
    // }

    // Items that can show an AbilityRollDialog
    if (
      doc.documentName === "Item" &&
      [ItemTypeEnum.Passion, ItemTypeEnum.Rune, ItemTypeEnum.Skill].includes(doc.type)
    ) {
      const actorName = doc?.parent?.prototypeToken?.name;
      const translationKey = actorName
        ? "RQG.Hotbar.MacroName.ToChatEmbedded"
        : "RQG.Hotbar.MacroName.ToChat";
      const name = localize(translationKey, { name: doc.name, actor: actorName });
      return { command: RqgHotbar.macroActions.get("abilityRoll")?.(doc), name: name };
    }

    // Roll table (draw a result and send to chat)
    if (doc.documentName === "RollTable") {
      return {
        command: RqgHotbar.macroActions.get("rollTable")?.(doc),
        name: localize("RQG.Hotbar.MacroName.RollTable", { name: doc.name }),
      };
    }

    // Default - toggle the display of the document sheet
    const actorName = doc?.parent?.prototypeToken?.name;
    const translationKey = actorName
      ? "RQG.Hotbar.MacroName.ToggleSheetEmbedded"
      : "RQG.Hotbar.MacroName.ToggleSheet";
    const name = localize(translationKey, { name: doc.name, actor: actorName });
    return { command: RqgHotbar.macroActions.get("toggleSheet")?.(doc), name: name };
  }
}
