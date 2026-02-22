import {
  categories as CATEGORIES,
  subCategoriesMap as SUB_CATEGORIES_MAP,
  departments as DEPARTMENTS,
} from "@/models/data";

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomDateString = (from = "2021-04-01", to = "2024-03-31") => {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  return new Date(fromMs + Math.random() * (toMs - fromMs)).toISOString().split("T")[0];
};

const zeroPad = (n: number, width = 3) => String(n).padStart(width, "0");

function generateMockReceipts(count = 40) {
  return Array.from({ length: count }, (_, i) => {
    const category = pickRandom(CATEGORIES);
    return {
      id: i + 1,
      date: randomDateString(),
      sanctionOrder: `S/${randomInt(2021, 2024)}/${zeroPad(i + 1)}`,
      category,
      amount: randomInt(50_000, 50_00_000),
      attachment: "",
    };
  });
}

function generateMockAllocations(count = 10) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    date: randomDateString("2021-04-01", "2024-03-31"),
    allocationNumber: `A/${randomInt(2021, 2024)}/${zeroPad(i + 1)}`,
    categoryAmounts: CATEGORIES.map((category) => ({
      category,
      allocatedAmount: randomInt(1_00_000, 20_00_000),
    })),
  }));
}

function generateMockExpenditures(count = 80) {
  return Array.from({ length: count }, (_, i) => {
    const category = pickRandom(CATEGORIES);
    const subCategory = pickRandom(SUB_CATEGORIES_MAP[category] ?? ["General"]);
    return {
      id: i + 1,
      date: randomDateString(),
      billNo: `B/${randomInt(2021, 2024)}/${zeroPad(i + 1)}`,
      voucherNo: `V/${randomInt(2021, 2024)}/${zeroPad(i + 1)}`,
      category,
      subCategory,
      department: pickRandom(DEPARTMENTS),
      amount: randomInt(10_000, 20_00_000),
      attachment: "",
    };
  });
}

let mockReceipts = generateMockReceipts();
let mockAllocations = generateMockAllocations();
let mockExpenditures = generateMockExpenditures();
let receiptIdCounter = mockReceipts.length + 1;
let allocationIdCounter = mockAllocations.length + 1;
let expenditureIdCounter = mockExpenditures.length + 1;

type MockRouteHandler = (url: URL, init?: RequestInit) => unknown;

const mockRoutes: [RegExp, MockRouteHandler][] = [
  [
    /canModify/,
    () => ({ allowed: true }),
  ],
  [
    /receipts\/read\.php/,
    () => ({ data: mockReceipts }),
  ],
  [
    /receipts\/create\.php/,
    (_url, init) => {
      const body = JSON.parse((init?.body as string) ?? "{}");
      const newReceipt = { ...body, id: receiptIdCounter++, amount: Number(body.amount) };
      mockReceipts = [...mockReceipts, newReceipt];
      return { success: true, id: newReceipt.id };
    },
  ],
  [
    /receipts\/update\.php/,
    (_url, init) => {
      const body = JSON.parse((init?.body as string) ?? "{}");
      mockReceipts = mockReceipts.map((r) => (r.id === body.id ? { ...r, ...body } : r));
      return { success: true };
    },
  ],
  [
    /receipts\/delete\.php/,
    (url) => {
      const id = Number(url.searchParams.get("id"));
      mockReceipts = mockReceipts.filter((r) => r.id !== id);
      return { success: true };
    },
  ],
  [
    /allocations\/read\.php/,
    () => ({ data: mockAllocations }),
  ],
  [
    /allocations\/create\.php/,
    (_url, init) => {
      const body = JSON.parse((init?.body as string) ?? "{}");
      const newAllocation = { ...body, id: allocationIdCounter++ };
      mockAllocations = [...mockAllocations, newAllocation];
      return { success: true, id: newAllocation.id };
    },
  ],
  [
    /allocations\/update\.php/,
    (_url, init) => {
      const body = JSON.parse((init?.body as string) ?? "{}");
      mockAllocations = mockAllocations.map((a) => (a.id === body.id ? { ...a, ...body } : a));
      return { success: true };
    },
  ],
  [
    /allocations\/delete\.php/,
    (url) => {
      const id = Number(url.searchParams.get("id"));
      mockAllocations = mockAllocations.filter((a) => a.id !== id);
      return { success: true };
    },
  ],
  [
    /expenditures\/read\.php/,
    () => ({ data: mockExpenditures }),
  ],
  [
    /expenditures\/create\.php/,
    (_url, init) => {
      const body = JSON.parse((init?.body as string) ?? "{}");
      const newExpenditure = { ...body, id: expenditureIdCounter++, amount: Number(body.amount) };
      mockExpenditures = [...mockExpenditures, newExpenditure];
      return { success: true, id: newExpenditure.id };
    },
  ],
  [
    /expenditures\/update\.php/,
    (_url, init) => {
      const body = JSON.parse((init?.body as string) ?? "{}");
      mockExpenditures = mockExpenditures.map((e) =>
        e.id === body.id ? { ...e, ...body } : e
      );
      return { success: true };
    },
  ],
  [
    /expenditures\/delete\.php/,
    (url) => {
      const id = Number(url.searchParams.get("id"));
      mockExpenditures = mockExpenditures.filter((e) => e.id !== id);
      return { success: true };
    },
  ],
  [
    /upload\.php/,
    () => ({ url: "" }),
  ],
];

const nativeFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlStr =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request).url;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    return nativeFetch(input, init);
  }

  for (const [pattern, handler] of mockRoutes) {
    if (pattern.test(urlStr)) {
      await new Promise((resolve) => setTimeout(resolve, 40 + Math.random() * 60));
      const data = handler(parsedUrl, init);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return nativeFetch(input, init);
};
