const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
  "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

function below1000(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  return ones[Math.floor(n / 100)] + " HUNDRED" + (n % 100 ? " " + below1000(n % 100) : "");
}

export function toWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return "ZERO SHILLINGS ONLY";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;
  let result = "";
  if (millions) result += below1000(millions) + " MILLION ";
  if (thousands) result += below1000(thousands) + " THOUSAND ";
  if (remainder) result += below1000(remainder) + " ";
  return result.trim() + " SHILLINGS ONLY";
}
