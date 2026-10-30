import { random } from "mathjs";
import { useRef } from "react";
import { useAppDispatch, useCalcActions  } from "../hooks";

const SolarPanel = () => {

  const { adjustVoltage } = useCalcActions();
  const dispatch = useAppDispatch();
  const solarPanelRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    dimPower();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    dimPower();
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    restoreFullVoltage();
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    dimPower();
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    restoreFullVoltage();
  }

  const dimPower = () => {
    dispatch(adjustVoltage({ voltageLevel: random(0.1, 0.8)}));
  };

  const restoreFullVoltage = () => {
    dispatch(adjustVoltage({ voltageLevel: 1.0 }));
  };

  return (
      <div
          ref={solarPanelRef}
          className="flex w-[50%] p-4 rounded-lg border-t border-black h-12 mb-6" 
          style={{ 
              background: "repeating-linear-gradient(to left, #350311, #350311 2px, #26020C 2px, #26020C 27px)",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
      />
  );
}

export default SolarPanel;
