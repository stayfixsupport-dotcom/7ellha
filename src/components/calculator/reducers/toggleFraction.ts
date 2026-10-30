import type { CalcState } from "../types";

import Fraction from "../classes/Fraction";
import updateFractionInputsIfNeeded from "./updateFractionInputsIfNeeded";
import { FRACTION_BAR } from "../constants";

function toggleFraction(calc: CalcState) {

  updateFractionInputsIfNeeded(calc);

  const fraction = resolveFraction(calc);
  const decimal = fraction.toDecimal();  
  const useMixed = decimal >= 1 && !isMixedFraction(calc.output);
  calc.output = fraction.format(useMixed);
  calc.lastInput = "frac";
  calc.fractionInputs = [];
}

function resolveFraction(calc: CalcState) {
  return calc.fractionInputs.length > 1
    ? Fraction.fromNumberArray(calc.fractionInputs)
    : Fraction.fromDecimal(parseFloat(calc.currentOperand));
}

function isMixedFraction(str: string) {
  return countFractionBars(str) === 2;
}

function countFractionBars(str: string) {
  return str
    .split("")
    .filter(x => x === FRACTION_BAR)
    .length;
}

export default toggleFraction;
