export type AccountType =
  | "Asset"
  | "Liability"
  | "Equity"
  | "Income"
  | "Expense";

export type ChartAccount = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  isGroup: boolean;
  parentId?: string | null;
  status: "Active" | "Inactive";
};

export const chartOfAccounts: ChartAccount[] = [
  {
    id: "1",
    code: "1000",
    name: "Assets",
    type: "Asset",
    isGroup: true,
    parentId: null,
    status: "Active",
  },
  {
    id: "2",
    code: "1010",
    name: "Cash",
    type: "Asset",
    isGroup: false,
    parentId: "1",
    status: "Active",
  },
  {
    id: "3",
    code: "1020",
    name: "Bank",
    type: "Asset",
    isGroup: false,
    parentId: "1",
    status: "Active",
  },
  {
    id: "4",
    code: "2000",
    name: "Liabilities",
    type: "Liability",
    isGroup: true,
    parentId: null,
    status: "Active",
  },
  {
    id: "5",
    code: "2010",
    name: "Accounts Payable",
    type: "Liability",
    isGroup: false,
    parentId: "4",
    status: "Active",
  },
];
