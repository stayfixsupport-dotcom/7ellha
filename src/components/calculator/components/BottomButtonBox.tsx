import React from "react";
import { LuPlus, LuMinus, LuX, LuDivide, LuDot, LuEqual } from "react-icons/lu";
import { MathJax } from "better-react-mathjax";
import { useAppDispatch, useAppSelector, useCalcActions } from "../hooks";

import type { OperatorType } from "../types";
import Button from "./Button";

const BottomButtonBox: React.FC = () => {

  const { 
    allClear,
    clear,
    evaluateExpression,
    expOrPi,
    percent,
    todo,
    toggleShift,
    updateCurrentOperand,
    updateExpression,
  } = useCalcActions();

  const dispatch = useAppDispatch();
  const isShiftEnabled = useAppSelector(state => state.calc.isShiftEnabled);

  const handleAllClearButtonClick = () => {
    dispatch(allClear());
  };

  const handleClearButtonClick = () => {
    dispatch(clear());
  };

  const handleDigitButtonClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const { innerHTML } = e.currentTarget as HTMLButtonElement; 
    dispatch(updateCurrentOperand({ input: innerHTML }));
  };

  const handleDecimalPointClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    dispatch(updateCurrentOperand({ input: "." }));
  };

  const handleOperatorButtonClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const currentTarget = e.currentTarget as HTMLButtonElement;
    const operator = currentTarget.getAttribute("data-operator")! as OperatorType;
    dispatch(updateExpression({ operator }));
  };

  const handleEqualsButtonClick = () => {
    if (isShiftEnabled) {
      dispatch(percent());
      dispatch(toggleShift());
    } else {
      dispatch(evaluateExpression());
    }
  };

  //console.log("rendering BottomButtonBox");

  return (
    <div className="grid grid-cols-5 grid-rows-4 gap-x-3 gap-y-1">

      {/* Row 1 */}

      <Button onClick={handleDigitButtonClick}>7</Button>
      <Button onClick={handleDigitButtonClick}>8</Button>
      <Button onClick={handleDigitButtonClick}>9</Button>
      <Button className="bg-red-500" onClick={handleClearButtonClick}>C</Button>
      
      <Button 
        className="bg-red-500" 
        onClick={handleAllClearButtonClick}
        buttonLabel={<>Mcl<span className="ml-2 text-neutral-300">ON</span></>}
      >
        AC
      </Button>

      {/* Row 2 */}

      <Button onClick={handleDigitButtonClick}>4</Button>
      <Button onClick={handleDigitButtonClick}>5</Button>
      <Button onClick={handleDigitButtonClick}>6</Button>
      
      <Button 
        operator="*" 
        ariaLabel="multiply" 
        onClick={handleOperatorButtonClick}
        buttonLabel={<MathJax>{"`x^y`"}</MathJax>}
      >
        <LuX />
      </Button>

      <Button 
        operator="/" 
        ariaLabel="divide" 
        onClick={handleOperatorButtonClick}
        buttonLabel={
          <MathJax>
              {"`x`"}
              <span className="relative -top-0.5">
                <span className="relative ml-0.5 -top-0.5 text-[10px]">1</span>/y
              </span>
          </MathJax>
        }
      >
        <LuDivide className="relative mt-0.5" />
      </Button>

      <Button onClick={handleDigitButtonClick}>1</Button>
      <Button onClick={handleDigitButtonClick}>2</Button>
      <Button onClick={handleDigitButtonClick}>3</Button>

      <Button 
        operator="+" 
        ariaLabel="plus" 
        onClick={handleOperatorButtonClick}
        buttonLabel={
          <MathJax>
            P<span className="mx-0.5">{"`to`"}</span>R
          </MathJax>
        }
      >
        <LuPlus className="relative mt-0.5" />
      </Button>

      <Button 
        operator="-" 
        ariaLabel="minus" 
        onClick={handleOperatorButtonClick}
        buttonLabel={
          <MathJax>
            R<span className="mx-0.5">{"`to`"}</span>P
          </MathJax>
        }
      >
        <LuMinus className="relative mt-0.5" />
      </Button>

      {/* Row 3 */}
      
      <Button onClick={handleDigitButtonClick} buttonLabel="RND">
        0
      </Button>
      
      <Button ariaLabel="decimal point" onClick={handleDecimalPointClick} buttonLabel="RAD#">
        <LuDot />
      </Button>
      
      <Button 
        ariaLabel="exponent or pi constant"
        onClick={() => dispatch(expOrPi())}
        buttonLabel={
          <MathJax className="text-sm -mt-1 text-neutral-300">
            {"`pi`"}
          </MathJax>
        }
      >
        <span className="scale-75">EXP</span>
      </Button>
      
      <Button onClick={() => dispatch(todo())}>
        <span className="scale-75">Ans</span>
      </Button>

      <Button 
        ariaLabel={isShiftEnabled ? "percent" : "equals"} 
        onClick={handleEqualsButtonClick}
        buttonLabel="%"
      >
        <LuEqual className="relative mt-0.5" />
      </Button>
    </div>
  );
};

export default BottomButtonBox;
