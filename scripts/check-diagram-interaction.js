const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('public/app.js', 'utf8');
const context = vm.createContext({
  Map, Math, console,
  diagramBuilderPieceMetrics: () => ({ visualWidth: 14, visualHeight: 72 }),
  renderDiagramBuilderWorkspace() {}, renderDiagramBuilderPalette() {},
  setDiagramBuilderStatus() {},
});
for (const name of ['diagramBuilderPortAssignments', 'cancelDiagramBuilderDeletion', 'confirmDiagramBuilderDeletion']) {
  const match = source.match(new RegExp(`^function ${name}\\([^]*?^}`, 'm'));
  assert(match, name);
  vm.runInContext(match[0], context);
}
const placements = [1, 2].map(id => ({ id, row: 1, column: id * 3, piece: { kind: 'sequence-activation' } }));
const session = { placements, cellWidth: 200, cellHeight: 150, gridZoom: .65,
  connections: Array.from({ length: 16 }, (_, i) => ({ id: i + 1, sourceId: i % 2 ? 2 : 1, targetId: i % 2 ? 1 : 2 })),
  surface: { querySelector(selector) {
    const id = Number(selector.match(/data-placement-id="(\d+)"/)[1]);
    return { getBoundingClientRect: () => ({ left: id * 300, top: 100, width: 14, height: 72 }) };
  } },
};
const sourceSides = new Map(session.connections.map(c => [c.id, c.sourceId === 1 ? 'right' : 'left']));
const targetSides = new Map(session.connections.map(c => [c.id, c.targetId === 1 ? 'right' : 'left']));
const assigned = context.diagramBuilderPortAssignments(session, sourceSides, targetSides);
for (const id of [1, 2]) {
  const ports = session.connections.map(c => c.sourceId === id ? assigned.source.get(c.id) : assigned.target.get(c.id));
  assert.equal(new Set(ports.map(p => p.toFixed(8))).size, 16, 'Mixed incoming/outgoing messages cannot share ports');
  assert(ports.every(p => p >= .14 - 1e-10 && p <= .86 + 1e-10));
}
const deletion = { placements, pendingConnectionDeletion: 1, toast: { hidden: false },
  connections: [{ id: 1 }, { id: 2 }], pins: [{ id: 4, connectionId: 1 }, { id: 5, connectionId: 2 }],
};
context.cancelDiagramBuilderDeletion(deletion);
assert.equal(deletion.connections.length, 2); assert.equal(deletion.pins.length, 2);
deletion.pendingConnectionDeletion = 1;
context.confirmDiagramBuilderDeletion(deletion);
assert.equal(deletion.connections.length, 1); assert.equal(deletion.connections[0].id, 2);
assert.equal(deletion.pins.length, 1); assert.equal(deletion.pins[0].connectionId, 2);
assert.equal(deletion.placements, placements);
assert.match(source, /session\.overlay\.append\(ghost\)/, 'Arrow preview must be outside the clipping canvas');
assert.match(source, /matrix: path\.getScreenCTM\(\)/, 'Preview preserves screen coordinates at the grab point');
assert.match(source, /const padding = 64;/);
assert.doesNotMatch(source, /viewport\.addEventListener\("scroll", onScroll/);
console.log('Diagram interaction: 16 mixed messages, shared ports, cancel/delete with pins, overlay preview and finite margins passed.');
