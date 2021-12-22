import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  SpiritMagicCastingRangeEnum,
  SpiritMagicDurationEnum,
  SpiritMagicConcentrationEnum,
  SpiritMagicDataProperties,
  SpiritMagicDataPropertiesData,
} from "../../data-model/item-data/spiritMagicData";
import { RqgActorSheet } from "../../actors/rqgActorSheet";
import { assertItemType, getJournalEntryName, RqgError } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";

interface SpiritMagicSheetData {
  isEmbedded: boolean;
  data: SpiritMagicDataProperties; // Actually contains more...complete with effects, flags etc
  spiritMagicData: SpiritMagicDataPropertiesData;
  sheetSpecific: {
    ranges: SpiritMagicCastingRangeEnum[];
    durations: SpiritMagicDurationEnum[];
    types: SpiritMagicConcentrationEnum[];
    journalEntryName: string;
  };
}

export class SpiritMagicSheet extends RqgItemSheet<
  ItemSheet.Options,
  SpiritMagicSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.SpiritMagic],
      template: "systems/rqg/items/spirit-magic-item/spiritMagicSheet.hbs",
      width: 520,
      height: 250,
    });
  }

  getData(): SpiritMagicSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.SpiritMagic);

    if (this.item.img === "icons/svg/item-bag.svg") {
      this.item.update({ img: "/systems/rqg/assets/images/items/spirit-magic.svg" }, {});
    }

    const spiritMagicData = itemData.data;
    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      isEmbedded: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      spiritMagicData: itemData.data,
      sheetSpecific: {
        ranges: Object.values(SpiritMagicCastingRangeEnum),
        durations: Object.values(SpiritMagicDurationEnum),
        types: Object.values(SpiritMagicConcentrationEnum),
        journalEntryName: getJournalEntryName(spiritMagicData),
      },
    };
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
    (this.form as HTMLElement).addEventListener("drop", this._onDrop.bind(this));

    // Open Linked Journal Entry
    (this.form as HTMLElement).querySelectorAll("[data-journal-id]").forEach((el: Element) => {
      const elem = el as HTMLElement;
      const pack = elem.dataset.journalPack;
      const id = elem.dataset.journalId;
      if (!id) {
        const msg = "Couldn't find linked journal entry from Spirit magic sheet";
        ui.notifications?.error(msg);
        throw new RqgError(msg, elem, pack, id);
      }
      el.addEventListener("click", () => RqgActorSheet.showJournalEntry(id, pack));
    });
  }

  protected async _onDrop(event: DragEvent): Promise<void> {
    super._onDrop(event);
    // Try to extract the data
    let droppedItemData;
    try {
      droppedItemData = JSON.parse(event.dataTransfer!.getData("text/plain"));
    } catch (err) {
      return;
    }
    if (droppedItemData.type === "JournalEntry") {
      const pack = droppedItemData.pack ? droppedItemData.pack : "";
      await this.item.update(
        { "data.journalId": droppedItemData.id, "data.journalPack": pack },
        {}
      );
    } else {
      ui.notifications?.warn("You can only drop a journalEntry");
    }
  }
}
