import type { CalcState } from "../types";

function allClear(calc: CalcState) {
  calc.numericMode = "decimal";
  calc.angleMode = calc.angleMode;
  calc.expression = [];
  calc.currentOperand = "0";
  calc.output = "0";
  calc.voltageLevel = 1.0;
  if ("lastInput" in calc) delete (calc as any).lastInput;
  if ("lastOperand" in calc) delete (calc as any).lastOperand;
  if ("repeatOperationAffixes" in calc) delete (calc as any).repeatOperationAffixes;
  calc.isShiftEnabled = false;
  calc.isHyperbolic = false;
  calc.fractionInputs = [];
  calc.sexagesimalInputs = [];
  calc.isBracketOpen = false;
};

export default allClear;
