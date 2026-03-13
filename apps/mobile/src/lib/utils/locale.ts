import { getLocale } from '$lib/paraglide/runtime.js';

/** Maps paraglide locale tags to BCP 47 locale tags for Intl APIs. */
const BCP47_MAP: Record<string, string> = {
	de: 'de-DE',
	en: 'en-US'
};

/** Returns the BCP 47 locale tag corresponding to the active paraglide locale. */
export function getBcp47Locale(): string {
	return BCP47_MAP[getLocale()] ?? 'de-DE';
}
