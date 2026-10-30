import React, { useState, useEffect } from "react";
import OperatorIndicator from "./OperatorIndicator";
import { useAppSelector } from "../hooks";

const angleModePositions = { 
  "deg": "left-32",
  "rad": "left-40",
  "grad": "left-48",
};

const Display: React.FC = () => {

  const angleMode = useAppSelector(state => state.calc.angleMode);
  const isShiftEnabled = useAppSelector(state => state.calc.isShiftEnabled);
  const isHyperbolic = useAppSelector(state => state.calc.isHyperbolic);
  const lastInput = useAppSelector(state => state.calc.lastInput);
  const output = useAppSelector(state => state.calc.output);
  const voltageLevel = useAppSelector(state => state.calc.voltageLevel);
  const isBracketOpen = useAppSelector(state => state.calc.isBracketOpen);

  const [showEqualsIndicator, setShowEqualsIndicator] = useState(false);
  const [isExponential, setIsExponential] = useState(false);
  const [angleModePosition, setAngleModePosition] = useState(angleModePositions["deg"]);

  useEffect(() => {
    const pos = angleModePositions[angleMode as "deg" | "rad" | "grad"];
    if (pos) setAngleModePosition(pos);
  }, [angleMode])

  useEffect(() => {
    setShowEqualsIndicator(lastInput === "=");
  }, [lastInput]);

  useEffect(() => {
    setIsExponential(output.includes("e"));
  }, [output])

  //console.log("rendering Display");

  return (
    <div className="relative flex w-full h-20 items-center justify-end mb-3 bg-[#687] font-sans rounded shadow-inner shadow-black overflow-hidden">
      
      <span 
        aria-label="angle mode indicator"
        className={`leading-none absolute top-1.5 px-0.5 uppercase text-xs text-stone-800 rounded-sm ${angleModePosition}`}
        style={{ opacity: voltageLevel }}
      >
        {angleMode}
      </span>    

      {isHyperbolic && (
        <span 
          aria-label={"hyperbolic indicator"}
          className="leading-none absolute top-1.5 left-12 px-0.5 text-xs text-stone-800"
          style={{ opacity: voltageLevel }}
        >
            hyp
          </span>
      )}

      {isShiftEnabled && (
        <span 
          aria-label="shift indicator"
          className="leading-none absolute top-1.5 right-14 px-0.5 text-xs text-[#687] bg-stone-800 rounded-sm"
          style={{ opacity: voltageLevel }}
        >
            S
          </span>
      )}

    {isBracketOpen && (
        <span 
          aria-label="bracket indicator"
          className="absolute top-1 left-2 text-xl text-stone-800"
          style={{ opacity: voltageLevel }}
        >
          (
          </span>
      )}

      {showEqualsIndicator && (
        <span 
          aria-label="equals indicator"
          className="absolute -top-[7px] left-2 text-3xl text-stone-800"
          style={{ opacity: voltageLevel }}
        >
            =
          </span>
      )}

      <span 
        data-testid="output" 
        className="leading-none self-end text-stone-800 text-[45px]" 
        style={{ opacity: voltageLevel }}>
          {isExponential ? (
            <ExponentialOutput exponentialNumber={output} />
          ) : (
            <div className="pr-7">
              <span className="pr-0.5">{output}</span>
            </div>
          )}
      </span>
      
      <OperatorIndicator />

    </div>
  );
};

interface ExponentialOutputProps {
  exponentialNumber: string;
}

const ExponentialOutput: React.FC<ExponentialOutputProps> = ({ exponentialNumber }) => {

  const [coefficient, setCoefficient] = useState<string>();
  const [exponent, setExponent] = useState<string>();

  useEffect(() => {
    if (exponentialNumber) {
      const parts = exponentialNumber.split("e");
      if (parts.length == 2) {
        setCoefficient(parts[0]!);
        setExponent(parts[1]!.replace("+", ""));
      }
    }
  }, [exponentialNumber]);

  return (
    <div className="flex items-center pr-1">
      <span aria-label="coefficient">{coefficient}</span>
      <span aria-label="times base" className="text-xs">x10</span>
      <sup aria-label="exponent" className="text-lg -ml-1.5 -mt-2">{exponent}</sup>
    </div>
  );
};

export default Display;
