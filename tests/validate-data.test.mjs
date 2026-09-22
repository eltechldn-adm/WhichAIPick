import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOLS_JSON_FILE = path.join(__dirname, '../data/tools.json');
const BACKUP_FILE = path.join(__dirname, '../data/tools.json.bak');

const testCases = [
    {
        name: "Duplicate IDs",
        data: [
            { id: "test-1", name: "Test 1", website_url: "https://test1.com", category: "unknown", operationalStatus: "active", transitionType: "none", recommendationEligible: false, contentReviewRequired: true },
            { id: "test-1", name: "Test 2", website_url: "https://test2.com", category: "unknown", operationalStatus: "active", transitionType: "none", recommendationEligible: false, contentReviewRequired: true }
        ],
        expectFail: true
    },
    {
        name: "Circular Successor",
        data: [
            { id: "test-1", name: "Test 1", website_url: "https://test1.com", category: "unknown", operationalStatus: "discontinued", transitionType: "none", recommendationEligible: false, contentReviewRequired: true, successorToolId: "test-2" },
            { id: "test-2", name: "Test 2", website_url: "https://test2.com", category: "unknown", operationalStatus: "active", transitionType: "none", recommendationEligible: false, contentReviewRequired: true, successorToolId: "test-1" }
        ],
        expectFail: true
    },
    {
        name: "Invalid Successor",
        data: [
            { id: "test-1", name: "Test 1", website_url: "https://test1.com", category: "unknown", operationalStatus: "discontinued", transitionType: "none", recommendationEligible: false, contentReviewRequired: true, successorToolId: "does-not-exist" }
        ],
        expectFail: true
    },
    {
        name: "recommendationEligible=true + contentReviewRequired=true",
        data: [
            { id: "test-1", name: "Test 1", website_url: "https://test1.com", category: "unknown", operationalStatus: "active", transitionType: "none", recommendationEligible: true, contentReviewRequired: true, long_description: "This is a very long description that surpasses the twenty character limit and is valid." }
        ],
        expectFail: true
    },
    {
        name: "Fabricated / Forbidden URL",
        data: [
            { id: "test-1", name: "Test 1", website_url: "https://example.com", category: "unknown", operationalStatus: "active", transitionType: "none", recommendationEligible: false, contentReviewRequired: true }
        ],
        expectFail: true
    },
    {
        name: "Valid Tool",
        data: [
            { id: "test-1", name: "Test 1", website_url: "https://test1.com", category: "unknown", operationalStatus: "active", transitionType: "none", recommendationEligible: false, contentReviewRequired: true }
        ],
        expectFail: false
    }
];

function runTest() {
    console.log("Running validate-data.mjs tests...");
    
    // Backup original
    fs.copyFileSync(TOOLS_JSON_FILE, BACKUP_FILE);

    let passed = 0;
    
    try {
        for (const tc of testCases) {
            fs.writeFileSync(TOOLS_JSON_FILE, JSON.stringify(tc.data, null, 2));
            try {
                execSync('node scripts/validate-data.mjs', { stdio: 'ignore' });
                if (tc.expectFail) {
                    console.error(`❌ Test failed: ${tc.name} (Expected to fail, but passed)`);
                } else {
                    console.log(`✅ Test passed: ${tc.name}`);
                    passed++;
                }
            } catch (e) {
                if (tc.expectFail) {
                    console.log(`✅ Test passed: ${tc.name}`);
                    passed++;
                } else {
                    console.error(`❌ Test failed: ${tc.name} (Expected to pass, but failed)`);
                }
            }
        }
    } finally {
        // Restore original
        fs.copyFileSync(BACKUP_FILE, TOOLS_JSON_FILE);
        fs.unlinkSync(BACKUP_FILE);
    }
    
    console.log(`\nTests completed: ${passed}/${testCases.length} passed.`);
    if (passed !== testCases.length) process.exit(1);
}

runTest();
