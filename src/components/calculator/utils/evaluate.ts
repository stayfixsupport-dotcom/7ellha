import { 
  addDependencies,
  acosDependencies,
  acoshDependencies,
  asinDependencies,
  asinhDependencies,
  atanDependencies,
  atanhDependencies,
  cbrtDependencies,
  cosDependencies,
  coshDependencies,
  create,
  cubeDependencies,
  divideDependencies,
  evaluateDependencies,
  expDependencies,
  factory,
  logDependencies,
  log10Dependencies,
  multiplyDependencies,
  sinDependencies,
  sinhDependencies,
  sqrtDependencies,
  squareDependencies,
  subtractDependencies,
  tanDependencies,
  tanhDependencies,
} from "mathjs";

type OperationFunction = (...args: number[]) => number;
const createOperation = (name: string, fn: OperationFunction) => factory(name, [], () => fn);
const powerOfTen = (exponent: number) => Math.pow(10, exponent);

const { evaluate } = create({
  addDependencies: addDependencies!,
  acosDependencies: acosDependencies!,
  acoshDependencies: acoshDependencies!,
  asinDependencies: asinDependencies!,
  asinhDependencies: asinhDependencies!,
  atanDependencies: atanDependencies!,
  atanhDependencies: atanhDependencies!,
  cbrtDependencies: cbrtDependencies!,
  cosDependencies: cosDependencies!,
  coshDependencies: coshDependencies!,
  cubeDependencies: cubeDependencies!,
  divideDependencies: divideDependencies!,
  evaluateDependencies: evaluateDependencies!,
  expDependencies: expDependencies!,
  logDependencies: logDependencies!,
  log10Dependencies: log10Dependencies!,
  multiplyDependencies: multiplyDependencies!,
  sinDependencies: sinDependencies!,
  sinhDependencies: sinhDependencies!,
  sqrtDependencies: sqrtDependencies!,
  squareDependencies: squareDependencies!,
  subtractDependencies: subtractDependencies!,
  tanDependencies: tanDependencies!,
  tanhDependencies: tanhDependencies!,
  createPowerOfTen: createOperation("powerOfTen", powerOfTen),
});

export default (expression: string[]): number => {
  return evaluate(expression.join(""));
}
