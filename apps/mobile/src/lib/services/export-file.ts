/**
 * Export File Service — platform-aware file sharing for export data.
 *
 * Native: writes to cache via Filesystem plugin → shares via Share plugin → cleans up.
 * Web: creates Blob → triggers download via invisible <a> element.
 *
 * Guards all calls with platform checks. Never throws — logs with `[Export]` prefix.
 *
 * @module
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// ── Helpers ──

/** Returns true when running on a native platform (iOS/Android). */
function isNative(): boolean {
	return Capacitor.isNativePlatform();
}

/**
 * Web fallback: trigger a file download via Blob + invisible anchor.
 */
function downloadViaBlob(filename: string, content: string, mimeType: string): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	// Clean up after a short delay to ensure download starts
	setTimeout(() => {
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, 100);
}

// ── Public API ──

/**
 * Share a single export file via native share sheet (or browser download on web).
 *
 * @param filename - The filename for the exported file (e.g. "workouts.csv")
 * @param content - The string content to export
 * @param mimeType - MIME type (e.g. "text/csv", "application/json")
 * @returns true if the share/download was initiated successfully
 */
export async function shareExportFile(
	filename: string,
	content: string,
	mimeType: string
): Promise<boolean> {
	if (!isNative()) {
		try {
			console.debug('[Export] shareExportFile: web download', filename);
			downloadViaBlob(filename, content, mimeType);
			return true;
		} catch (error) {
			console.error('[Export] shareExportFile: web download failed', error);
			return false;
		}
	}

	// Native path: write → get URI → share → cleanup
	try {
		console.debug('[Export] shareExportFile: native', filename);

		await Filesystem.writeFile({
			path: filename,
			data: content,
			directory: Directory.Cache,
			encoding: Encoding.UTF8
		});

		const { uri } = await Filesystem.getUri({
			path: filename,
			directory: Directory.Cache
		});

		await Share.share({ files: [uri] });

		// Best-effort cleanup — don't let cleanup failure affect the result
		try {
			await Filesystem.deleteFile({
				path: filename,
				directory: Directory.Cache
			});
			console.debug('[Export] shareExportFile: cache cleaned', filename);
		} catch {
			console.debug('[Export] shareExportFile: cache cleanup skipped', filename);
		}

		console.log('[Export] shareExportFile: success', filename);
		return true;
	} catch (error) {
		console.error('[Export] shareExportFile: failed', filename, error);
		return false;
	}
}

/**
 * Share multiple export files via native share sheet (or sequential web downloads).
 *
 * Native: writes all files to cache, shares them together in one share sheet.
 * Web: triggers sequential downloads (one per file).
 *
 * @param files - Array of files to export
 * @returns true if all shares/downloads were initiated successfully
 */
export async function shareMultipleExportFiles(
	files: Array<{ filename: string; content: string; mimeType: string }>
): Promise<boolean> {
	if (files.length === 0) return true;

	if (!isNative()) {
		try {
			console.debug('[Export] shareMultipleExportFiles: web download', files.length, 'files');
			for (const file of files) {
				downloadViaBlob(file.filename, file.content, file.mimeType);
			}
			return true;
		} catch (error) {
			console.error('[Export] shareMultipleExportFiles: web download failed', error);
			return false;
		}
	}

	// Native path: write all → get URIs → share all → cleanup all
	const writtenPaths: string[] = [];
	try {
		console.debug('[Export] shareMultipleExportFiles: native', files.length, 'files');

		// Write all files to cache
		for (const file of files) {
			await Filesystem.writeFile({
				path: file.filename,
				data: file.content,
				directory: Directory.Cache,
				encoding: Encoding.UTF8
			});
			writtenPaths.push(file.filename);
		}

		// Get URIs for all files
		const uris: string[] = [];
		for (const path of writtenPaths) {
			const { uri } = await Filesystem.getUri({
				path,
				directory: Directory.Cache
			});
			uris.push(uri);
		}

		// Share all files together
		await Share.share({ files: uris });

		// Best-effort cleanup
		for (const path of writtenPaths) {
			try {
				await Filesystem.deleteFile({
					path,
					directory: Directory.Cache
				});
			} catch {
				// Ignore cleanup failures
			}
		}
		console.debug('[Export] shareMultipleExportFiles: cache cleaned');

		console.log('[Export] shareMultipleExportFiles: success', files.length, 'files');
		return true;
	} catch (error) {
		console.error('[Export] shareMultipleExportFiles: failed', error);

		// Best-effort cleanup on error
		for (const path of writtenPaths) {
			try {
				await Filesystem.deleteFile({
					path,
					directory: Directory.Cache
				});
			} catch {
				// Ignore cleanup failures
			}
		}

		return false;
	}
}
