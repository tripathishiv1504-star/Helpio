import { EventEmitter } from 'events';

// Shared EventEmitter singleton for the entire application
export const events = new EventEmitter();

// Event names as defined in the PRD Addendum
export const EVENT_NAMES = Object.freeze({
  REQUEST_POSTED: 'request:posted',
  STATUS_CHANGED: 'status:changed',
  OFFER_CREATED: 'offer:created',
  MESSAGE_CREATED: 'message:created',
});

export default events;
