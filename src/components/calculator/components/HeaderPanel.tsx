import React from "react";
import ProductLabel from "./ProductLabel";
import SolarPanel from "./SolarPanel";

const HeaderPanel: React.FC = () => {
  return (
    <div className="flex flex-row justify-between mt-3">
      <ProductLabel />
      <SolarPanel />
    </div>
  );
};

export default HeaderPanel;
