import React from "react";
import { Provider } from "react-redux";
import { MathJaxContext } from "better-react-mathjax";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Calculator from "./calculator/components/Calculator";
import { store } from "./calculator/store";

const mathJaxConfig = {
  loader: { load: ["input/asciimath"] },
  displaystyle: false,
};

export function CalculatorModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-fit p-3 bg-zinc-950 border-ink/30 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>الحاسبة العلمية</DialogTitle>
        </DialogHeader>
        <div className="casio-calc dir-ltr select-none" style={{ touchAction: "manipulation" }}>
          <Provider store={store}>
            <MathJaxContext config={mathJaxConfig} hideUntilTypeset="first">
              <Calculator />
            </MathJaxContext>
          </Provider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
