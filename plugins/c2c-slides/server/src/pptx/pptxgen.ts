/**
 * Shim typów pptxgenjs. Deklaracje pakietu są traktowane jako CJS, więc pod NodeNext
 * `import * as mod` daje typ { default: <moduł> } i klasa leży pod mod.default.default.
 * W runtime (warunek "import" w exports) klasa jest pod mod.default. Normalizujemy oba przypadki.
 */
import * as mod from "pptxgenjs";

type Ctor = typeof mod.default.default;
export type PptxGen = InstanceType<Ctor>;

const m = mod as unknown as { default?: { default?: unknown } | unknown };
const candidate = (m.default as { default?: unknown } | undefined)?.default ?? m.default ?? mod;
export const PptxGenCtor = candidate as Ctor;
