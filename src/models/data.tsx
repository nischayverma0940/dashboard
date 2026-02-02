export const categories: string[] = [
  "OH-31 Grant-in-Aid General",
  "OH-35 Grants for Creation of Capital Assets",
  "OH-36 Grant-in-Aid Salary"
]

export const subCategoriesMap: Record<string, string[]> = {
  "OH-31 Grant-in-Aid General": [
    "31.01 Pension & Pensionary Benefits",
    "31.02 Scholarships/Fellowships",
    "31.03 Foreign/Domestic Travels",
    "31.04 Security/Housekeeping",
    "31.05 Exp. on Contractual Employees [Teaching and Non-Teaching]",
    "31.06 Other Expenses",
    "31.07 Repayment of HEFA Loan - Principal Portion",
    "31.08 Repayment of HEFA Loan - Interest Portion"
  ],
  "OH-35 Grants for Creation of Capital Assets": [
    "35.01 Building",
    "35.02 Equipments",
    "35.03 Library",
    "35.04 Furniture"
  ],
  "OH-36 Grant-in-Aid Salary": [
    "36.01 Expenditure on salary on Regular Faculty",
    "36.02 Expenditure on salary on Regular Non-Faculty",
    "36.03 Medical Expenses",
    "36.04 Leave Encashment",
    "36.05 LTC",
    "36.06 Professional Development Allowance (PDA)",
    "36.07 Retirement Benefits",
    "36.08 Other Expenses"
  ]
}

export const departments: string[] = [
  "Not Applicable",
  "Computer Science and Engineering",
  "Information Technology",
  "Electronics and Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Biotechnology",
  "Chemical Engineering",
  "Physics",
  "Chemistry",
  "Mathematics",
  "Humanities and Social Sciences"
]

export const categoryType: Record<string, string[]> = {
  "Recurring": [
    "OH-31 Grant-in-Aid General",
    "OH-36 Grant-in-Aid Salary"
  ],
  "Non-Recurring": [
    "OH-35 Grants for Creation of Capital Assets"
  ]
}
