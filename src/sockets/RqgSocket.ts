import { systemId } from "../system/config";
import { getGame, getGameUser, getGameUsers, getSocket, RqgError } from "../system/util";
import type { ChatMessageDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";
import type { PropertiesToSource } from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";

type SocketAction = {
  payload: SocketActionPayload;
  socketMessageId?: string;
};

type SocketActionPayload = DeleteCombatantPayload | UpdateChatMessagePayload;

type DeleteCombatantPayload = {
  action: "deleteCombatant"; // action is a Discriminated Union
  combatId: string;
  idsToDelete: string[];
};

type UpdateChatMessagePayload = {
  action: "updateChatMessage"; // action is a Discriminated Union
  messageId: string;
  messageAuthorId: string; // Owner of the chat message (userId)
  update: PropertiesToSource<ChatMessageDataProperties>;
};

const eventNameSpace = `system.${systemId}`;
const pendingRequests = new Map<string, (value: unknown) => void>(); // socketMessageId to stored promise

/**
 * Start the handler for socket messages
 */
export function initSockets() {
  getSocket().on(eventNameSpace, handleSocketMsg);
}

// Request - response pattern
export async function socketRequest(payload: SocketActionPayload): Promise<any> {
  // TODO Add a race between a timeout and the Promise to clear the pendingRequests
  return new Promise((resolve) => {
    const messageId = randomID();
    pendingRequests.set(messageId, resolve);
    getSocket().emit(eventNameSpace, { messageId: messageId, payload: payload });
  });
}

// Send and forget
export function socketSend(payload: SocketActionPayload): void {
  getSocket().emit(eventNameSpace, { payload: payload });
}

function handleSocketMsg(request: SocketAction): void {
  // let responsePromise;

  if (request.socketMessageId) {
    // responsePromise = pendingRequests.get(request.socketMessageId);
    pendingRequests.delete(request.socketMessageId);
  }

  switch (request.payload.action) {
    case "deleteCombatant": {
      if (!isResponsibleGM()) {
        return;
      }
      const combat = getGame().combats?.get(request.payload?.combatId);
      const idsToDelete = request.payload?.idsToDelete;
      combat?.deleteEmbeddedDocuments("Combatant", idsToDelete);
      break;
    }

    case "updateChatMessage": {
      if (getGameUser().id !== request.payload.messageAuthorId) {
        return;
      }

      const attackChatMessage = getGame().messages?.get(request.payload.messageId);
      attackChatMessage?.update(request.payload.update);
      break;
    }

    // --- Left here as an example for any future implementation that might need a request-response message

    // case "deleteCombatantRequest": {
    //   if (!getGameUser().isGM) {
    //     return;
    //   }
    //   const combat = getGame().combats?.get(request.payload?.combatId);
    //   const idsToDelete = request.payload?.idsToDelete;
    //   combat?.deleteEmbeddedDocuments("Combatant", idsToDelete);
    //   getSocket().emit(eventNameSpace, {
    //     socketMessageId: request.socketMessageId,
    //     payload: { action: "deleteCombatantResponse", response: "deleted it now" },
    //   });
    //   break;
    // }

    // case "deleteCombatantResponse": {
    //   if (responsePromise) {
    //     responsePromise(request.payload.response);
    //   }
    //   break;
    // }

    // ---

    default: {
      const msg = `Got unknown socket action in payload`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, request);
    }
  }
}

function isResponsibleGM() {
  if (!getGameUser().isGM) {
    return false;
  }
  const connectedGMs = getGameUsers().filter(isActiveGM);
  return !connectedGMs.some((other) => other.id < (getGameUser().id ?? " "));
}

function isActiveGM(user: User) {
  return user.active && user.isGM;
}
