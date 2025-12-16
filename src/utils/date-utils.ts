import moment from "moment";

export function formatDate(date: Date): string {
	return moment(date).utc().format("YYYY-MM-DD HH:mm:ss");
}

// export function formatDateToYYYYMMDD(date: Date): string {
// 	return date.toISOString().substring(0, 10);
// }
