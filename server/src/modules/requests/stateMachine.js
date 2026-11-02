import { ServiceRequest } from '../../models/index.js';
import { REQUEST_STATUS, PRICING_TYPE } from '../../../../shared/constants.js';
import { events, EVENT_NAMES } from './events.js';

/**
 * Legal transition rules table based on PRD Section 8 and Section D:
 * POSTED → OFFERED → ACCEPTED → IN_PROGRESS → COMPLETED → PAID → RATED
 * - CANCELLED: from POSTED, OFFERED or ACCEPTED by user/admin
 * - EXPIRED: from OFFERED when no helper accepts
 * - DISPUTED: from COMPLETED or PAID when a complaint is filed
 * - Free community jobs skip PAID: COMPLETED → RATED
 * - From DISPUTED: admin only may transition to PAID, RATED or CANCELLED
 */
export const LEGAL_TRANSITIONS = Object.freeze({
  [REQUEST_STATUS.POSTED]: [
    { to: REQUEST_STATUS.OFFERED, allowedActors: ['system', 'admin'] },
    { to: REQUEST_STATUS.CANCELLED, allowedActors: ['user', 'admin'] },
  ],
  [REQUEST_STATUS.OFFERED]: [
    { to: REQUEST_STATUS.ACCEPTED, allowedActors: ['helper', 'system', 'admin'] },
    { to: REQUEST_STATUS.EXPIRED, allowedActors: ['system', 'admin'] },
    { to: REQUEST_STATUS.CANCELLED, allowedActors: ['user', 'admin'] },
  ],
  [REQUEST_STATUS.ACCEPTED]: [
    { to: REQUEST_STATUS.IN_PROGRESS, allowedActors: ['helper', 'admin'] },
    { to: REQUEST_STATUS.CANCELLED, allowedActors: ['user', 'admin'] },
  ],
  [REQUEST_STATUS.IN_PROGRESS]: [
    { to: REQUEST_STATUS.COMPLETED, allowedActors: ['helper', 'admin'] },
  ],
  [REQUEST_STATUS.COMPLETED]: [
    {
      to: REQUEST_STATUS.PAID,
      allowedActors: ['user', 'system', 'admin'],
      validate: (request) => {
        if (request.pricingType === PRICING_TYPE.FREE) {
          throw new Error('Free community jobs cannot transition to PAID; they transition directly to RATED.');
        }
        return true;
      },
    },
    {
      to: REQUEST_STATUS.RATED,
      allowedActors: ['user', 'admin'],
      validate: (request) => {
        if (request.pricingType !== PRICING_TYPE.FREE) {
          throw new Error('Paid jobs must transition to PAID before transitioning to RATED.');
        }
        return true;
      },
    },
    { to: REQUEST_STATUS.DISPUTED, allowedActors: ['user', 'helper', 'admin'] },
  ],
  [REQUEST_STATUS.PAID]: [
    { to: REQUEST_STATUS.RATED, allowedActors: ['user', 'admin'] },
    { to: REQUEST_STATUS.DISPUTED, allowedActors: ['user', 'helper', 'admin'] },
  ],
  [REQUEST_STATUS.RATED]: [],
  [REQUEST_STATUS.CANCELLED]: [],
  [REQUEST_STATUS.EXPIRED]: [],
  [REQUEST_STATUS.DISPUTED]: [
    { to: REQUEST_STATUS.PAID, allowedActors: ['admin'] },
    { to: REQUEST_STATUS.RATED, allowedActors: ['admin'] },
    { to: REQUEST_STATUS.CANCELLED, allowedActors: ['admin'] },
  ],
});

/**
 * Validates whether a transition from `fromStatus` to `toStatus` by `actor` on `request` is legal.
 */
export function isTransitionLegal(request, toStatus, actor) {
  const currentStatus = request.status;
  const availableMoves = LEGAL_TRANSITIONS[currentStatus] || [];
  const match = availableMoves.find((move) => move.to === toStatus);

  if (!match) {
    return {
      legal: false,
      reason: `Illegal transition: cannot move status from "${currentStatus}" to "${toStatus}".`,
    };
  }

  const normalizedActor = (actor || '').toLowerCase();
  const actorAllowed = match.allowedActors.includes(normalizedActor) || normalizedActor === 'admin';
  if (!actorAllowed) {
    return {
      legal: false,
      reason: `Actor "${actor}" is not permitted to transition from "${currentStatus}" to "${toStatus}". Allowed: [${match.allowedActors.join(', ')}].`,
    };
  }

  if (typeof match.validate === 'function') {
    try {
      match.validate(request);
    } catch (valErr) {
      return {
        legal: false,
        reason: valErr.message,
      };
    }
  }

  return { legal: true };
}

/**
 * Core state transition function.
 * Validates actor and move, appends statusHistory, saves document, and emits 'status:changed'.
 *
 * @param {string|object} requestOrId - Mongoose document or requestId
 * @param {string} toStatus - Target status
 * @param {string} actor - Actor initiating transition ('user', 'helper', 'admin', 'system')
 * @param {object} meta - Optional metadata to attach to history
 * @returns {Promise<ServiceRequest>}
 */
export async function transition(requestOrId, toStatus, actor, meta = {}) {
  let request = requestOrId;
  if (typeof requestOrId === 'string' || requestOrId instanceof String) {
    request = await ServiceRequest.findById(requestOrId);
    if (!request) {
      const error = new Error(`ServiceRequest not found: ${requestOrId}`);
      error.status = 404;
      throw error;
    }
  }

  const fromStatus = request.status;
  const check = isTransitionLegal(request, toStatus, actor);
  if (!check.legal) {
    const error = new Error(check.reason);
    error.status = 400;
    throw error;
  }

  // Update status & history
  request.status = toStatus;
  request.statusHistory.push({
    status: toStatus,
    changedAt: new Date(),
    actor,
    meta,
  });

  await request.save();

  // Emit event
  events.emit(EVENT_NAMES.STATUS_CHANGED, {
    request,
    from: fromStatus,
    to: toStatus,
    actor,
    meta,
  });

  return request;
}

export default {
  LEGAL_TRANSITIONS,
  isTransitionLegal,
  transition,
};
