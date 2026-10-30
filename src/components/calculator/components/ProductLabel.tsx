const ProductLabel = () => {
  return (
    <div className="flex flex-col">
        <div className="flex flex-row text-zinc-400">
          <span className="mr-1">SOLAR</span>
          <strong>SIM</strong>
        </div>
        <div className="flex flex-row px-1 text-center bg-zinc-400 rounded text-black self-start gap-0.5">
          <span className="">fx-82</span>
          <span>TS</span>
        </div>
    </div>
  );
}

export default ProductLabel;
