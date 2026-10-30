import React, { useState, useEffect } from "react";
import { LuPlus, LuMinus, LuX, LuDivide } from "react-icons/lu";
import { useAppSelector } from "../hooks";

const operatorLookup: { [key: string]: { ariaLabel: string, icon: React.ReactElement }} = {
  "+": { ariaLabel: "plus indicator", icon: <LuPlus /> },
  "-": { ariaLabel: "minus indicator", icon: <LuMinus /> },
  "*": { ariaLabel: "multiply indicator", icon: <LuX /> },
  "/": { ariaLabel: "divide indicator", icon: <LuDivide /> },
};

const operators = Object.keys(operatorLookup);

const OperatorIndicator = () => {

  const lastInput = useAppSelector(state => state.calc.lastInput);
  const voltageLevel = useAppSelector(state => state.calc.voltageLevel);
  const [operator, setOperator] = useState<{ ariaLabel: string, icon: React.ReactElement } | undefined>();

  useEffect(() => {
    if (lastInput && operators.includes(lastInput)) {
      setOperator(operatorLookup[lastInput]);
    }
    else
    {
      setOperator(undefined);
    }
  }, [lastInput]);

  return (
    <>
      {operator && (
        <span 
          data-testid="operator-indicator"          
          className="absolute self-end right-1 text-bg-stone-800 text-md"
          aria-label={operator.ariaLabel}
          style={{ opacity: voltageLevel }}
        > 
          {operator.icon}
        </span>
      )}
    </>
  );
};

export default OperatorIndicator;
