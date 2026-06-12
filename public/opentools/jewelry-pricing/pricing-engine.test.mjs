import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Engine = require('./pricing-engine.js');
require('./app-state.js');

const State = globalThis.JewelryPricingState;

function closeTo(actual, expected, tolerance = 0.02) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

const sample = State.createCrimsonPetalSample();
const calc = Engine.calculatePricing(sample);

closeTo(calc.totals.materialsSubtotal, 142.12, 0.02);
closeTo(calc.totals.adjustedLabor, 268, 0.01);
closeTo(calc.totals.overhead, 143.54, 0.02);
closeTo(calc.totals.contingency, 19.38, 0.02);
closeTo(calc.totals.cogs, 593.04, 0.03);
closeTo(calc.channels.direct.sellPrice, 2194.22, 1);
closeTo(calc.channels.direct.margin, 72.97, 0.1);

assert.equal(Engine.getVolumeReductionPercent(1), 0);
assert.equal(Engine.getVolumeReductionPercent(12), 20);
assert.equal(Engine.getVolumeReductionPercent(25), 35);
assert.equal(Engine.getVolumeReductionPercent(100), 45);
assert.equal(Engine.getVolumeReductionPercent(12, 22.5), 22.5);

const titanium = State.createBlankState();
titanium.materials = [{
  id: 'mat-test',
  materialKey: 'titanium',
  label: 'Titanium',
  purityFactor: 1,
  finishedWeight: 10,
  wastagePercent: 15,
  unitPrice: 0.08,
  handlingCharge: 5
}];
titanium.stones = [];
titanium.components = [];
titanium.labor = [{ id: 'labor-test', process: 'Machining', quantity: 2, unit: 'hr', unitCost: 40 }];
titanium.finishing = [{ id: 'finish-test', description: 'Anodizing', quantity: 1, unit: 'pc', unitCost: 12 }];
titanium.batchSize = 20;
titanium.volumeReductionPercent = 35;
titanium.overheadPercent = 30;
titanium.contingencyPercent = 5;
titanium.freightAdminCost = 3;

const titaniumCalc = Engine.calculatePricing(titanium);
closeTo(titaniumCalc.totals.metalsSubtotal, 5.92, 0.01);
closeTo(titaniumCalc.totals.adjustedLabor, 52, 0.01);
closeTo(titaniumCalc.totals.overhead, 17.38, 0.01);
closeTo(titaniumCalc.totals.contingency, 3.77, 0.01);
closeTo(titaniumCalc.totals.cogs, 94.07, 0.02);

titanium.actuals = {
  materialCost: 7,
  laborCost: 60,
  reworkCost: 4,
  otherCost: 8,
  actualCogs: 0
};
const varianceCalc = Engine.calculatePricing(titanium);
closeTo(varianceCalc.actuals.actualCogs, 79, 0.01);
closeTo(varianceCalc.actuals.variance, -15.07, 0.03);

const handoff = Engine.buildInvoiceHandoff(sample, calc);
assert.equal(handoff.sourceFormat, 'jewelry-pricing');
assert.equal(handoff.quoteNumber, 'JQ-CRIMSON-001');
assert.equal(handoff.quantity, 12);
assert.equal(handoff.selectedChannel, 'direct');

console.log('pricing-engine tests passed');
