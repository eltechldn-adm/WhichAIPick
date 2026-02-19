// Tool descriptions data management
let descriptionsData = new Map();
let descriptionsLoaded = false;

// Load and parse descriptions CSV
async function loadDescriptions() {
    if (descriptionsLoaded) return;

    try {
        const response = await fetch('/data/tool-descriptions.csv?v=1.6');
        const text = await response.text();

        // Parse CSV
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',');

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const id = values[0]?.trim();
            const short_description = values.slice(1).join(',').trim(); // Handle commas in description

            if (id && short_description) {
                descriptionsData.set(id, short_description);
            }
        }

        descriptionsLoaded = true;
    } catch (error) {
        console.warn('Descriptions data not available:', error);
        descriptionsLoaded = true; // Mark as loaded even on error to avoid retry
    }
}

// Get description for a tool
function getDescriptionForTool(toolId) {
    return descriptionsData.get(toolId) || null;
}

// Format description for display (max 160 chars)
function formatDescription(description) {
    if (!description) return null;

    if (description.length > 160) {
        return description.substring(0, 157) + '...';
    }

    return description;
}
