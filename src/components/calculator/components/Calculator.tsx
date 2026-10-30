import BottomButtonBox from "./BottomButtonBox";
import Display from "./Display";
import HeaderPanel from "./HeaderPanel";
import TopButtonBox from "./TopButtonBox";

const Calculator = () => {
  
  return (
    <div className="flex flex-col w-[345px]">

      <div className="flex flex-col pt-2 px-2 bg-zinc-900 rounded-t-xl rounded-x-xl md:shadow-drop">

        <div 
          className="flex flex-col px-2 pb-3 h-full bg-charcoal-dark rounded-t-xl rounded-x-xl shadow-edge"
          style={{ clipPath: "inset(-8px -8px 0px -8px)"}}
        >
          <div className="border border-slate-950 border-1 bg-gradient-to-br from-slate-600 to-slate-950 px-3 mb-4 -mt-0.5 -mx-2 rounded-lg shadow-edge">
              <HeaderPanel />
              <Display />
            </div>
         
            <div className="flex flex-col space-y-4 mt-1">
              <TopButtonBox />
              <BottomButtonBox />
            </div>
        </div>
        
      </div>

      <CurvedBase />
    </div>
  );
};

const CurvedBase: React.FC = () => {
  return (
    <div className="pb-2 px-2 bg-zinc-900 rounded-x-xl rounded-b-[50%] md:shadow-drop">
      <div 
        className="px-2 pb-4 h-full md:h-auto bg-charcoal-dark rounded-b-[50%] rounded-x-xl shadow-edge"
        style={{ clipPath: "inset(0px -8px -8px -8px)"}}
        />
    </div>
  );
};

export default Calculator;
