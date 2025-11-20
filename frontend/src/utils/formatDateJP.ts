// export function formatDateJP(dateString: string): string {
//   return new Date(dateString).toLocaleDateString("ja-JP", {
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//     timeZone: "Asia/Tokyo"
//   });
// }

export function formatDateJP(dateString: string | null) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${year}年${month}月${day}日`;
}

export const formatMonthDayJP = (dateString: string): string => {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${month}月${day}日`;
};