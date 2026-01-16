import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Format bytes to human readable string
export function formatBytes(bytes: number, decimals = 1) {
	if (bytes === 0) return '0 B';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format bits/sec (e.g. for network rate)
export function formatSpeed(bytesPerSec: number, decimals = 1) {
	if (bytesPerSec === 0) return '0 B/s';
	// Convert to bits if you prefer bits/s, but commonly OS shows bytes/s
	// If you want KB/s:
	return formatBytes(bytesPerSec, decimals) + '/s';
}

export type WithElementRef<T> = T & { ref?: unknown };
export type WithoutChildrenOrChild<T> = T;
