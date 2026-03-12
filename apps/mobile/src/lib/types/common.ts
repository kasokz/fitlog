/**
 * Common types shared across all domain modules.
 */

/** UUID v4 string identifier */
export type UUID = string;

/** ISO 8601 timestamp string */
export type Timestamp = string;

/** Fields for soft-deletable entities */
export interface SoftDeletable {
	created_at: Timestamp;
	updated_at: Timestamp;
	deleted_at: Timestamp | null;
}
