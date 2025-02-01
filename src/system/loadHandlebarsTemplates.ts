/**
 * Paths not used as handlebars partials
 */
export const templatePaths = {
  // Actor sheets
  rqgActorSheet: "systems/rqg/actors/rqgActorSheet.hbs",

  // Item Sheets
  itemArmorSheet: "systems/rqg/items/armor-item/armorSheet.hbs",
  itemCultSheet: "systems/rqg/items/cult-item/cultSheet.hbs",
  itemGearSheet: "systems/rqg/items/gear-item/gearSheet.hbs",
  itemHitLocationSheet: "systems/rqg/items/hit-location-item/hitLocationSheet.hbs",
  itemHomelandSheet: "systems/rqg/items/homeland-item/homelandSheet.hbs",
  itemOccupationSheet: "systems/rqg/items/occupation-item/occupationSheet.hbs",
  itemPassionSheet: "systems/rqg/items/passion-item/passionSheet.hbs",
  itemRuneSheet: "systems/rqg/items/rune-item/runeSheet.hbs",
  itemRuneMagicSheet: "systems/rqg/items/rune-magic-item/runeMagicSheet.hbs",
  itemWeaponSheet: "systems/rqg/items/weapon-item/weaponSheet.hbs",
  itemSkillSheet: "systems/rqg/items/skill-item/skillSheet.hbs",
  itemSpiritMagicSheet: "systems/rqg/items/spirit-magic-item/spiritMagicSheet.hbs",

  // Dice & Rolls
  abilityRollTooltip: "systems/rqg/rolls/AbilityRoll/abilityRollTooltip.hbs",
  abilityRoll: "systems/rqg/rolls/AbilityRoll/abilityRoll.hbs",
  characteristicRollTooltip: "systems/rqg/rolls/CharacteristicRoll/characteristicRollTooltip.hbs",
  characteristicRoll: "systems/rqg/rolls/CharacteristicRoll/characteristicRoll.hbs",
  spiritMagicRollTooltip: "systems/rqg/rolls/SpiritMagicRoll/spiritMagicRollTooltip.hbs",
  spiritMagicRoll: "systems/rqg/rolls/SpiritMagicRoll/spiritMagicRoll.hbs",
  runeMagicRollTooltip: "systems/rqg/rolls/RuneMagicRoll/runeMagicRollTooltip.hbs",
  runeMagicRoll: "systems/rqg/rolls/RuneMagicRoll/runeMagicRoll.hbs",

  // Chat
  chatMessage: "systems/rqg/chat/chat-message.hbs",
  chatWeaponHandler: "systems/rqg/chat/weaponChatHandler.hbs",
  attackChatMessage: "systems/rqg/applications/AttackFlow/attackChatTemplate.hbs",

  rqidTooltip: "systems/rqg/documents/rqid-tooltip.hbs",

  // Actor Wizard
  actorWizardApplication: "systems/rqg/applications/actorWizardApplication.hbs",

  // Applications & Dialogs
  dialogRuneMagicCult: "systems/rqg/items/rune-magic-item/runeMagicCultDialog.hbs",
  dialogImproveAbility: "systems/rqg/applications/improveAbilityDialog.hbs",
  dialogMigrateWorld: "systems/rqg/applications/migrateWorldDialog.hbs",
  dialogRqidEditor: "systems/rqg/applications/rqidEditor/rqidEditor.hbs",
  rqidBatchEditor: "systems/rqg/applications/rqid-batch-editor/rqidBatchEditor.hbs",
  confirmCopyIntangibleItem: "systems/rqg/applications/confirmCopyIntangibleItem.hbs",
  confirmTransferPhysicalItem: "systems/rqg/applications/confirmTransferPhysicalItem.hbs",
  hitLocationAddWound: "systems/rqg/items/hit-location-item/hitLocationAddWound.hbs",
  hitLocationHealWound: "systems/rqg/items/hit-location-item/hitLocationHealWound.hbs",
  abilityRollDialog: "systems/rqg/applications/abilityRollDialog/abilityRollDialog.hbs",
  characteristicRollDialog:
    "systems/rqg/applications/CharacteristicRollDialog/characteristicRollDialog.hbs",
  spiritMagicRollDialog: "systems/rqg/applications/SpiritMagicRollDialog/spiritMagicRollDialog.hbs",
  runeMagicRollDialog: "systems/rqg/applications/RuneMagicRollDialog/runeMagicRollDialog.hbs",
  attackDialog: "systems/rqg/applications/AttackFlow/attackDialog.hbs",
  defenceDialog: "systems/rqg/applications/AttackFlow/defenceDialog.hbs",

  // Settings
  defaultItemIconSettings: "./systems/rqg/applications/defaultItemIconSettings.hbs",

  // Interface
  rqgPause: "systems/rqg/foundryUi/rqgPause.hbs",
} as const;

export const loadHandlebarsTemplates = async function () {
  /**
   * Paths used with handlebars partials: {{> key}}
   */
  const partialPaths = {
    // ActorSheet tabs
    actorCombatTab: "systems/rqg/actors/sheet-parts/combat-tab/combat-tab.hbs",
    actorHealth: "systems/rqg/actors/sheet-parts/combat-tab/health/health.hbs",
    actorHumanoidHitLocations:
      "systems/rqg/actors/sheet-parts/combat-tab/health/humanoid-hit-locations.hbs",
    actorDefaultHitlocations:
      "systems/rqg/actors/sheet-parts/combat-tab/health/default-hit-locations.hbs",
    actorHitLocationStats:
      "systems/rqg/actors/sheet-parts/combat-tab/health/hit-location-stats.hbs",
    actorCombat: "systems/rqg/actors/sheet-parts/combat-tab/combat.hbs",
    actorSpiritCombat: "systems/rqg/actors/sheet-parts/combat-tab/spirit-combat.hbs",

    actorRuneTab: "systems/rqg/actors/sheet-parts/runes-tab/runes-tab.hbs",
    actorRuneElements: "systems/rqg/actors/sheet-parts/runes-tab/runes-elemental.hbs",
    actorRunePower: "systems/rqg/actors/sheet-parts/runes-tab/runes-power.hbs",
    actorRuneForm: "systems/rqg/actors/sheet-parts/runes-tab/runes-form.hbs",
    actorRuneCondition: "systems/rqg/actors/sheet-parts/runes-tab/runes-condition.hbs",
    actorRuneGrid: "systems/rqg/actors/sheet-parts/runes-tab/grid-rune.hbs",

    actorSpiritMagicTab: "systems/rqg/actors/sheet-parts/spirit-magic-tab.hbs",

    actorRuneMagicTab: "systems/rqg/actors/sheet-parts/rune-magic-tab.hbs",

    actorSorceryTab: "systems/rqg/actors/sheet-parts/sorcery-tab.hbs",

    actorSkillsTab: "systems/rqg/actors/sheet-parts/skills-tab/skills-tab.hbs",
    actorSkillsGrid: "systems/rqg/actors/sheet-parts/skills-tab/grid-skill.hbs",

    actorGearTab: "systems/rqg/actors/sheet-parts/gear-tab/gear-tab.hbs",
    actorGearPhysicalItemLocation:
      "systems/rqg/actors/sheet-parts/gear-tab/physical-item-location.hbs",

    actorPassionsTab: "systems/rqg/actors/sheet-parts/passions-tab.hbs",

    actorBackgroundTab: "systems/rqg/actors/sheet-parts/background-tab.hbs",

    actorActiveEffectsTab: "systems/rqg/actors/sheet-parts/activeeffects-debug-tab.hbs",

    // Actor Wizard Sheet Parts
    wizardCreationSpecies: "systems/rqg/applications/actor-wizard-sheet-parts/creation-species.hbs",
    wizardCreationHomeland:
      "systems/rqg/applications/actor-wizard-sheet-parts/creation-homeland.hbs",

    // Item sheet parts
    itemActiveEffects: "systems/rqg/items/sheet-parts/itemActiveEffects.hbs",
    itemCommonPhysical: "systems/rqg/items/sheet-parts/itemCommonPhysical.hbs",

    // RqidLink partials
    rqidLink: "systems/rqg/sheet-partials/rqidLink.hbs",
    rqidLinkDropzone: "systems/rqg/sheet-partials/rqidLinkDropzone.hbs",
    rqidLinkArrayDropzone: "systems/rqg/sheet-partials/rqidLinkArrayDropzone.hbs",
    rqidLinkSelector: "systems/rqg/sheet-partials/rqidLinkSelector.hbs",
  } as const;

  // @ts-expect-error object
  return loadTemplates(partialPaths);
};
