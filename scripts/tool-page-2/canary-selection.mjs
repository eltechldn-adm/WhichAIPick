import fs from 'fs';
import path from 'path';

/**
 * Tool Page V2 canary selection.
 *
 * Activation is explicit and fail-closed:
 *   - TOOL_PAGE_V2_CANARY unset or empty  -> no V2 pages, V1 for every tool (default).
 *   - TOOL_PAGE_V2_CANARY=1               -> V2 pages for exactly the IDs approved in
 *                                            data/release/tool-page-v2-canary.json.
 *   - any other value                     -> hard failure (never "all", never "true").
 *
 * The selection can never exceed MAX_CANARY_TOOLS, so a misconfigured manifest cannot
 * silently turn into a full-catalogue rollout.
 */
export const CANARY_ENV_VAR = 'TOOL_PAGE_V2_CANARY';
export const CANARY_MANIFEST_ENV_VAR = 'TOOL_PAGE_V2_CANARY_MANIFEST';
export const DEFAULT_MANIFEST_RELATIVE_PATH = 'data/release/tool-page-v2-canary.json';
export const MAX_CANARY_TOOLS = 16;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CanarySelectionError extends Error {
    constructor(message) {
        super(`[CANARY CONFIG FATAL] ${message}`);
        this.name = 'CanarySelectionError';
    }
}

export function isCanaryRequested(env = process.env) {
    const raw = env[CANARY_ENV_VAR];
    if (raw === undefined || raw === '') return false;
    if (raw !== '1') {
        throw new CanarySelectionError(`${CANARY_ENV_VAR} must be unset or exactly "1" (received "${raw}").`);
    }
    return true;
}

export function resolveManifestPath(root, env = process.env) {
    const override = env[CANARY_MANIFEST_ENV_VAR];
    return path.resolve(root, override && override !== '' ? override : DEFAULT_MANIFEST_RELATIVE_PATH);
}

export function readManifest(manifestPath) {
    if (!fs.existsSync(manifestPath)) {
        throw new CanarySelectionError(`Canary manifest not found: ${manifestPath}`);
    }
    try {
        return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (error) {
        throw new CanarySelectionError(`Canary manifest is not valid JSON: ${error.message}`);
    }
}

export function validateManifest(manifest, tools) {
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
        throw new CanarySelectionError('Manifest must be a JSON object.');
    }
    const ids = manifest.approvedToolIds;
    if (!Array.isArray(ids) || ids.length === 0) {
        throw new CanarySelectionError('approvedToolIds must be a non-empty array.');
    }
    if (!Number.isInteger(manifest.expectedCount) || manifest.expectedCount !== ids.length) {
        throw new CanarySelectionError(`expectedCount (${manifest.expectedCount}) must equal approvedToolIds length (${ids.length}).`);
    }
    if (ids.length > MAX_CANARY_TOOLS) {
        throw new CanarySelectionError(`approvedToolIds has ${ids.length} entries; maximum is ${MAX_CANARY_TOOLS}.`);
    }

    const seen = new Set();
    const toolById = new Map(tools.map(tool => [tool.id, tool]));
    for (const id of ids) {
        if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
            throw new CanarySelectionError(`Invalid tool ID in allowlist: ${JSON.stringify(id)}`);
        }
        if (seen.has(id)) {
            throw new CanarySelectionError(`Duplicate tool ID in allowlist: ${id}`);
        }
        seen.add(id);
        const record = toolById.get(id);
        if (!record) {
            throw new CanarySelectionError(`Unknown tool ID (not in data/tools.json): ${id}`);
        }
        if (record.directoryEligible !== true) {
            throw new CanarySelectionError(`Tool is not directoryEligible: ${id}`);
        }
        if (record.contentReviewRequired === true) {
            throw new CanarySelectionError(`Tool requires content review and cannot be canaried: ${id}`);
        }
    }
    return [...ids];
}

/**
 * Returns the validated, ordered list of canary IDs, or [] when the canary is not requested.
 * Throws CanarySelectionError for any invalid configuration. Never falls back to "all tools".
 */
export function resolveCanarySelection({ root, tools, env = process.env, manifestReader = readManifest }) {
    if (!isCanaryRequested(env)) return [];
    const manifest = manifestReader(resolveManifestPath(root, env));
    return validateManifest(manifest, tools);
}
