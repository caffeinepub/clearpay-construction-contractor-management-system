/**
 * Formats a number as Indian Rupee currency with two decimal places
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "₹1,23,456.78")
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
