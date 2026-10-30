import type { CalcState } from "../types";

function clear(calc: CalcState) {
  calc.numericMode = "decimal";
  calc.currentOperand = "0";
  calc.output = "0";
  if ("lastInput" in calc) delete (calc as any).lastInput;
  if ("lastOperand" in calc) delete (calc as any).lastOperand;
  if ("repeatOperationAffixes" in calc) delete (calc as any).repeatOperationAffixes;
  calc.isShiftEnabled = false;
  calc.isHyperbolic = false;
  calc.fractionInputs = [];
  calc.sexagesimalInputs = [];
}

export default clear;
