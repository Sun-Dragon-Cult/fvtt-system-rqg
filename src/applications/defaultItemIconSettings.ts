import { getGame, localize } from "../system/util";
import Options = FormApplication.Options;
import { systemId } from "../system/config";
import { defaultItemIconsObject } from "../system/settings/defaultItemIcons";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { templatePaths } from "../system/loadHandlebarsTemplates";

export interface IconSettingsData {
  [ItemTypeEnum.Armor]: string;
  [ItemTypeEnum.Cult]: string;
  [ItemTypeEnum.Gear]: string;
  [ItemTypeEnum.HitLocation]: string;
  [ItemTypeEnum.Homeland]: string;
  [ItemTypeEnum.Occupation]: string;
  [ItemTypeEnum.Passion]: string;
  [ItemTypeEnum.Rune]: string;
  [ItemTypeEnum.RuneMagic]: string;
  [ItemTypeEnum.Skill]: string;
  [ItemTypeEnum.SpiritMagic]: string;
  [ItemTypeEnum.Weapon]: string;
  reputation: string;
}

export class DefaultItemIconSettings extends FormApplication<
  FormApplication.Options,
  IconSettingsData
> {
  constructor(object: any, options?: Partial<Options>) {
    super(object, options);
  }

  static get defaultOptions(): Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "default-icons-settings-dialog",
      title: localize("RQG.Settings.DefaultItemIcons.dialogTitle"),
      template: templatePaths.defaultItemIconSettings,
      classes: ["form", "default-icons"],
      width: 500,
      closeOnSubmit: false,
      submitOnChange: true,
    });
  }

  protected _onSelectFile(selection: string, filePicker: FilePicker): void {
    super._onSelectFile(selection, filePicker);
    this.submit();
  }

  getData(): IconSettingsData {
    const currentSettings: any = getGame().settings.get(systemId, "defaultItemIconSettings");
    const settings = Object.entries(defaultItemIconsObject).reduce((acc: any, [key, value]) => {
      acc[key] = currentSettings[key] ?? value;
      return acc;
    }, {});
    return settings;
  }

  async _updateObject(event: Event, formData?: object): Promise<void> {
    if (formData != null) {
      const data = expandObject(formData);
      await getGame().settings.set(systemId, "defaultItemIconSettings", data);
      this.render();
    }
  }
}
