# SECTION C — RULES (copy verbatim into docs/RULES.md)

R1 Ownership: a part edits only the folders named in its prompt. Never edit files owned by another part.
R2 Auto-registration: a server module lives in server/src/modules/<name>/ and its index.js exports { mountPath, router, service?, init? }. app.js loads every module and calls init() if present. A client feature lives in client/src/features/<name>/ and its routes.jsx exports an array of { path, element, roles, nav? }. The router and navbar load these automatically. Navbar widgets: any features/<name>/navWidget.jsx default export is rendered in the navbar. Never hand-edit app.js, the router or the navbar to add a feature.
R3 Frozen contracts: shared/constants.js, server/src/models/*, the response shape { success, data, error }, and the transition table in modules/requests/stateMachine.js. Changes are additive only (new field, new enum value). Never rename or delete.
R4 Request detail panels: any feature may add features/<name>/requestPanel.jsx whose default export is { id, order, visibleWhen(request, user), Component }. The request detail page loads them automatically.
R5 Only modules/requests/stateMachine.js changes request status. Other modules call transition(requestId, toStatus, actor, meta).
R6 Controllers stay thin; logic lives in <module>.service.js. A module may call another module only through that module's index.js exports or through the event emitter.
R7 Finish every part by: running lint and tests, appending ONLY that part's section to docs/PROGRESS.md (files created, endpoints, how to verify), then moving on only as Section A allows.
R8 No refactors, renames or extra features outside the part's scope. If blocked, write it under "Blockers" in docs/PROGRESS.md and stop.
R9 Configuration through .env; keep .env.example current; no secrets in code.

Repo layout:
helpio/
  docs/ (PRD.md, RULES.md, PROGRESS.md, BUILD_PACK.md)
  shared/ (constants.js)
  server/src/ (app.js, server.js, config/, middleware/, models/, modules/<name>/, utils/, seed/)
  client/src/ (app/, components/ui/, lib/, features/<name>/)
