import { registerRqgSystemSettings } from "./system/rqgSystemSettings.js";
import { loadHandlebarsTemplates, templatePaths } from "./system/loadHandlebarsTemplates.js";
import { RqgActor } from "./actors/rqgActor.js";
import { RqgItem } from "./items/rqgItem";
import { registerHandlebarsHelpers } from "./system/registerHandlebarsHelpers";
import { RqgActiveEffect } from "./active-effect/rqgActiveEffect";
import { RqgCombat } from "./combat/rqgCombat";
import { RQG_CONFIG, systemId } from "./system/config";
import { applyDefaultWorldMigrations, migrateWorld } from "./system/migrations/migrateWorld";
import { RqgCombatTracker } from "./combat/RqgCombatTracker";
import { RqgToken } from "./combat/rqgToken";
import {
  cacheAvailableHitLocations,
  cacheAvailableRunes,
  getGame,
  getGameUser,
} from "./system/util";
import { RqgPause } from "./foundryUi/rqgPause";
import { RqgChatMessage } from "./chat/RqgChatMessage";
import { nameGeneration } from "./system/api/nameGeneration.js";
import { Rqid } from "./system/api/rqidApi.js";
import { RqgRollTableConfig } from "./rollTables/rqgRollTableConfig";
import { RqgHotbar } from "./foundryUi/rqgHotbar";
import { TextEditorHooks } from "./foundryUi/textEditorHooks";
import { RqgJournalEntry } from "./journals/rqgJournalEntry";
import { getTokenStatusEffects } from "./system/tokenStatusEffects";
import { RqgSettings } from "./foundryUi/RqgSettings";
import { RqidBatchEditor } from "./applications/rqid-batch-editor/rqidBatchEditor";
import { ItemTypeEnum } from "./data-model/item-data/itemTypes";
import { dragRulerModuleIntegrationInit } from "./external-module-integrations/drag-ruler";
import { initSockets } from "./sockets/RqgSocket";
import { AbilityRoll } from "./rolls/AbilityRoll/AbilityRoll";
import { CharacteristicRoll } from "./rolls/CharacteristicRoll/CharacteristicRoll";
import { SpiritMagicRoll } from "./rolls/SpiritMagicRoll/SpiritMagicRoll";
import { RuneMagicRoll } from "./rolls/RuneMagicRoll/RuneMagicRoll";

Hooks.once("init", async () => {
  console.log(
    "%c                                                                                            \n" +
      "                                                                                            \n" +
      '`7MM"""Mq.                                   .g8""8q.                                 mm    \n' +
      "  MM   `MM.                                .dP'    `YM.                               MM    \n" +
      '  MM   ,M9 `7MM  `7MM  `7MMpMMMb.  .gP"Ya  dM\'      `MM `7MM  `7MM  .gP"Ya  ,pP"Ybd mmMMmm  \n' +
      "  MMmmdM9    MM    MM    MM    MM ,M'   Yb MM        MM   MM    MM ,M'   Yb 8I   `\"   MM    \n" +
      '  MM  YM.    MM    MM    MM    MM 8M"""""" MM.      ,MP   MM    MM 8M"""""" `YMMMa.   MM    \n' +
      "  MM   `Mb.  MM    MM    MM    MM YM.    , `Mb.    ,dP'   MM    MM YM.    , L.   I8   MM    \n" +
      ".JMML. .JMM. `Mbod\"YML..JMML  JMML.`Mbmmd'   `\"bmmd\"'     `Mbod\"YML.`Mbmmd' M9mmmP'   `Mbmo \n" +
      "                                                 MMb                                        \n" +
      "                                                  `bood'                                    \n" +
      "              ,,                                             ,,                 \n" +
      '  .g8"""bgd `7MM                                      mm   `7MM                 \n' +
      ".dP'     `M   MM                                      MM     MM                 \n" +
      'dM\'       `   MM  ,pW"Wq.`7Mb,od8 ,6"Yb.  `7MMpMMMb.mmMMmm   MMpMMMb.   ,6"Yb.  \n' +
      "MM            MM 6W'   `Wb MM' \"'8)   MM    MM    MM  MM     MM    MM  8)   MM  \n" +
      "MM.    `7MMF' MM 8M     M8 MM     ,pm9MM    MM    MM  MM     MM    MM   ,pm9MM  \n" +
      "`Mb.     MM   MM YA.   ,A9 MM    8M   MM    MM    MM  MM     MM    MM  8M   MM  \n" +
      "  `\"bmmmdPY .JMML.`Ybmd9'.JMML.  `Moo9^Yo..JMML  JMML.`Mbmo.JMML  JMML.`Moo9^Yo.\n" +
      "                                                                                \n" +
      "                                                                                \n",
    "color: #F3A71E",
  );
  console.log("RQG | Initializing the Runequest Glorantha Game System");

  CONFIG.RQG = RQG_CONFIG;

  // CONFIG.debug.hooks = true; // console log when hooks fire
  // CONFIG.debug.time = true; // console log time

  CONFIG.time = {
    turnTime: 0, // Don't advance time per combatant
    roundTime: 12, // Melee round
  };

  CONFIG.statusEffects = getTokenStatusEffects();

  // @ts-expect-error fontDefinitions
  CONFIG.fontDefinitions["Norse"] = {
    editor: true,
    fonts: [
      { urls: ["systems/rqg/assets/fonts/Norse-KaWl.otf"] },
      { urls: ["systems/rqg/assets/fonts/NorseBold-2Kge.otf"], weight: "bold" },
    ],
  };

  CONFIG.Dice.rolls = [
    ...CONFIG.Dice.rolls,
    AbilityRoll,
    CharacteristicRoll,
    SpiritMagicRoll,
    RuneMagicRoll,
  ];
  CONFIG.ChatMessage.template = templatePaths.chatMessage;

  Rqid.init();
  RqgChatMessage.init();
  RqgActiveEffect.init();
  RqgCombat.init();
  RqgCombatTracker.init();
  RqgToken.init();
  RqgActor.init();
  RqgItem.init();
  RqgPause.init();
  RqgHotbar.init();
  RqgJournalEntry.init();
  TextEditorHooks.init();
  RqgSettings.init();
  initSockets();

  dragRulerModuleIntegrationInit();

  // @ts-expect-error unregisterSheet
  RollTables.unregisterSheet("core", RollTableConfig);
  // @ts-expect-error registerSheet
  RollTables.registerSheet(systemId, RqgRollTableConfig as any, {
    label: "RQG.SheetName.RollTable",
    makeDefault: true,
  });

  await loadHandlebarsTemplates();
  registerHandlebarsHelpers();
  registerRqgSystemSettings();

  // Define the system.api
  (getGame().system as any).api = {
    migrate: applyDefaultWorldMigrations,
    rqid: Rqid,
    /**
     * Show an application that lets you set rqid for items.
     */
    batchSetRqids: async (...itemTypes: string[]): Promise<void> => {
      const itemTypeEnums = itemTypes.length
        ? itemTypes.map((it) => it as ItemTypeEnum)
        : [
            ItemTypeEnum.Skill, // weapon skills need Rqid for weapon -> skill link
            ItemTypeEnum.RuneMagic, // common spells need Rqid for visualisation in spell list
            ItemTypeEnum.Rune, // Future needs
          ];
      await RqidBatchEditor.factory(...itemTypeEnums);
    },
    names: nameGeneration,
  };
});

Hooks.once("ready", async () => {
  await migrateWorld();
  // Make sure the cache of available runes is preloaded
  await cacheAvailableRunes();

  // Make sure the cache of available hit locations is preloaded
  await cacheAvailableHitLocations();

  // Verify that at least one wiki module is activated
  if (
    getGameUser().isGM &&
    ![...getGame().modules.entries()].some(
      ([name, mod]) => /wiki-[a-z]{2}-rqg/.test(name) && mod.active,
    )
  ) {
    await Rqid.renderRqidDocument("je..quick-start");
  }
});
