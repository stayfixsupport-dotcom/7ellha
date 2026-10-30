import type { ActionCreatorWithoutPayload } from "@reduxjs/toolkit";
import React, { useEffect, useState } from "react";
import { MathJax } from "better-react-mathjax";
import { PiPlusMinus } from "react-icons/pi";

import type { FunctionType } from "../types";
import type { TrigFunction } from "../classes/TrigFunctionConfig";
import Button from "./Button";
import TrigFunctionConfig from "../classes/TrigFunctionConfig";
import { useAppDispatch, useAppSelector, useCalcActions } from "../hooks";

const {
  adjustVoltage,
  backspace,
  closeBracket,
  cycleDrgMode,
  decimalToSexagesimal,
  executeFunction,
  fractionMode,
  inputSexagesimal,
  invertSign,
  openBracket,
  todo,
  toggleFraction,
  toggleHyperbolic,
  toggleShift,
} = useCalcActions();

const TopButtonBox: React.FC = () => {

  const dispatch = useAppDispatch();
  const isShiftEnabled = useAppSelector(state => state.calc.isShiftEnabled);
  const isHyperbolic = useAppSelector(state => state.calc.isHyperbolic);

  const [sin, setSin] = useState<TrigFunction>({ func: "sin", aria: "sine"});
  const [cos, setCos] = useState<TrigFunction>({ func: "cos", aria: "cosine"});
  const [tan, setTan] = useState<TrigFunction>({ func: "tan", aria: "tangent"});
  
  const handleMathFunctionButtonClick = (primaryFunc: FunctionType, secondaryFunc: FunctionType) => {
    const func = isShiftEnabled ? secondaryFunc : primaryFunc;
    dispatch(executeFunction({ func }));
    toggleShiftIfNeeded();
  };
  
  const handleUtilityButtonClick = (primaryAction: ActionCreatorWithoutPayload, secondaryAction: ActionCreatorWithoutPayload) => {
    const action = (isShiftEnabled ? secondaryAction : primaryAction)();
    dispatch(action);
    toggleShiftIfNeeded();
  };

  const handleTrigonometricButtonClick = (trigFunc: FunctionType) => {
    dispatch(executeFunction({ func: trigFunc }));
    toggleShiftIfNeeded();
  };

  const handleUtilityButtonClickWithSecondFunc = (primaryAction: ActionCreatorWithoutPayload, secondFunc: FunctionType) => {
    const action = isShiftEnabled ? executeFunction({ func: secondFunc}) : primaryAction();
    dispatch(action)
    toggleShiftIfNeeded();
  };

  const toggleShiftIfNeeded = () => {
    if (isShiftEnabled) {
      dispatch(toggleShift());
    }
  };

  useEffect(() => {
    setSin(TrigFunctionConfig.instance.get("sin", isShiftEnabled, isHyperbolic));
    setCos(TrigFunctionConfig.instance.get("cos", isShiftEnabled, isHyperbolic));
    setTan(TrigFunctionConfig.instance.get("tan", isShiftEnabled, isHyperbolic));
  }, [isHyperbolic, isShiftEnabled]);

  //console.log("rendering TopButtonBox");

  return (
    <div className="grid grid-cols-6 grid-rows-3 gap-x-2.5 gap-y-1">

      {/* Row 1 */}

      <Button 
        ariaLabel="shift" 
        className="fn" 
        onClick={() => dispatch(toggleShift())}
        buttonLabel={"SHIFT"}>
        &nbsp;
      </Button>

      <Button 
        ariaLabel={!isShiftEnabled ? "square root" : "square"} 
        className="fn" 
        onClick={() => handleMathFunctionButtonClick("sqrt", "square")}
        buttonLabel={<MathJax>{"`x^2`"}</MathJax>}
      >
        <MathJax className="scale-75">{"`root()(x)`"}</MathJax>
      </Button>

      <Button 
        ariaLabel={!isShiftEnabled ? "log" : "power of ten"}
        className="fn"
        onClick={() => handleMathFunctionButtonClick("log10", "powerOfTen")}
        buttonLabel={<MathJax>{"`10^x`"}</MathJax>}
      >
        log
      </Button>

      <Button 
        ariaLabel={!isShiftEnabled ? "natural log" : "exp x" }
        className="fn" 
        onClick={() => handleMathFunctionButtonClick("log", "exp")}
        buttonLabel={<MathJax>{"`e^x`"}</MathJax>}
      >
        ln
      </Button>

      <Button 
        ariaLabel="angle mode"
        className="fn" 
        onClick={() => dispatch(cycleDrgMode())}
      >
        <span className="ml-1">DRG▸</span>
      </Button>

      <Button className="fn" onClick={() => dispatch(adjustVoltage({ voltageLevel: 0.0 }))}>
        OFF
      </Button>

      {/* Row 2 */}

      <Button 
        ariaLabel={!isShiftEnabled ? "fraction mode" : "toggle fraction"}
        className="fn" 
        onClick={() => handleUtilityButtonClick(fractionMode, toggleFraction)}
        buttonLabel={<><span className="relative ml-0.5 -top-0.5">d</span>/c</>}
      >
        <MathJax>
          <span className="text-lg">{"`a`"}</span>
          <span className="relative ml-0.5 -top-0.5">b</span>/c
        </MathJax>
      </Button>

      <Button 
        ariaLabel={!isShiftEnabled ? "sexagesimal to decimal" : "decimal to sexagesimal"}
        className="fn" 
        onClick={() => handleUtilityButtonClick(inputSexagesimal, decimalToSexagesimal)}
        buttonLabel={<MathJax>{"`leftarrow`"}</MathJax>}
      >
        <span className="text-lg ml-0.5 mt-1">°</span>
        <span className="text-2xl ml-0.5 mt-2">’</span>
        <span className="text-2xl ml-0.5 mt-2">”</span>
      </Button>

      <Button 
        ariaLabel="hyperbolic"
        className="fn" 
        onClick={() => dispatch(toggleHyperbolic())
      }>
        hyp
      </Button>

      <Button 
        ariaLabel={sin.aria}
        className="fn" 
        onClick={() => handleTrigonometricButtonClick(sin.func)}
        buttonLabel={<MathJax>{"`sin^-1`"}</MathJax>}
      >
        sin
      </Button>

      <Button 
        ariaLabel={cos.aria}
        className="fn" 
        onClick={() => handleTrigonometricButtonClick(cos.func)}
        buttonLabel={<MathJax>{"`cos^-1`"}</MathJax>}
        >
        cos
      </Button>

      <Button 
        ariaLabel={tan.aria}
        className="fn" 
        onClick={() => handleTrigonometricButtonClick(tan.func)}
        buttonLabel={<MathJax>{"`tan^-1`"}</MathJax>}
      >
        tan
      </Button>

      {/* Row 3 */}

      <Button 
        ariaLabel={!isShiftEnabled ? "invert sign" : "cube root"}
        className="fn" 
        onClick={() => handleUtilityButtonClickWithSecondFunc(invertSign, "cbrt")}
        buttonLabel={<MathJax className="scale-75">{"`root(3)(x)`"}</MathJax>}
      >
        <PiPlusMinus className="text-2xl pt-0.5" />
      </Button>
      
      <Button 
        ariaLabel={!isShiftEnabled ? "backspace" : "cube"}
        className="fn" 
        onClick={() => handleUtilityButtonClickWithSecondFunc(backspace, "cube")}
        buttonLabel={<MathJax>{"`x^3`"}</MathJax>}
      >
        ►
      </Button>

      <Button 
        ariaLabel="open bracket"
        className="fn" 
        onClick={() => dispatch(openBracket())}
        buttonLabel={<MathJax><span className="relative -top-0.5 text-[10px]">1</span>{"/`x`"}</MathJax>}
      >
        <div className="flex font-bold items-center">
          <span className="text-sm pr-0.5">(</span>
          <span className="text-xs pr-0.5">(</span>
          <span className="text-sm">---</span>
        </div>
      </Button>

      <Button 
        ariaLabel="close bracket"
        className="fn" 
        onClick={() => dispatch(closeBracket())}
        buttonLabel={<MathJax>{"`x!`"}</MathJax>}
      >
        <div className="flex font-bold items-center">
          <span className="text-sm">---</span>
          <span className="text-xs pl-0.5">)</span>
          <span className="text-sm pl-0.5">)</span>
        </div>
      </Button>

      <Button 
        className="fn" 
        onClick={() => dispatch(todo())}
        buttonLabel="Min"
      >
        MR
      </Button>

      <Button 
        className="fn" 
        onClick={() => dispatch(todo())}
        buttonLabel={"M-"}
      >
        M+
      </Button>
    </div>
  );
};

export default TopButtonBox;
