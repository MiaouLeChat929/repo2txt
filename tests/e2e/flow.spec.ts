import { test, expect } from '@playwright/test';

const MOCK_REPO_URL = 'https://github.com/test-owner/test-repo';

test.describe('Repo2Txt User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock GitHub API
    // Mock commits API for root SHA
    await page.route('https://api.github.com/repos/test-owner/test-repo/commits/**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ commit: { tree: { sha: 'mock-tree-sha' } } }),
        });
    });

    // Keep contents mock for file/dir lookups if needed, though scenario uses root
    await page.route('https://api.github.com/repos/test-owner/test-repo/contents/**', async (route) => {
      // This might be called if path is provided
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sha: 'mock-file-sha' }),
      });
    });

    await page.route('https://api.github.com/repos/test-owner/test-repo/git/trees/mock-tree-sha?recursive=1', async (route) => {
      // fetchRepoTree calls this. Return the file tree.
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tree: [
            {
              path: 'package.json',
              type: 'blob',
              sha: 'sha-package',
              url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/sha-package',
              size: 100
            },
            {
              path: 'src/index.ts',
              type: 'blob',
              sha: 'sha-index',
              url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/sha-index',
              size: 200
            },
            {
              path: 'tests/app.test.ts',
              type: 'blob',
              sha: 'sha-test',
              url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/sha-test',
              size: 150
            },
            {
              path: 'README.md',
              type: 'blob',
              sha: 'sha-readme',
              url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/sha-readme',
              size: 500
            },
            {
                path: 'node_modules/some-lib/index.js',
                type: 'blob',
                sha: 'sha-node-modules',
                url: 'https://api.github.com/repos/test-owner/test-repo/git/blobs/sha-node-modules',
                size: 1000
            }
          ]
        }),
      });
    });

    // Mock File Content Requests
    await page.route('https://api.github.com/repos/test-owner/test-repo/git/blobs/**', async (route) => {
      const url = route.request().url();
      let content = 'mock content';
      if (url.includes('sha-package')) content = '{ "name": "test-repo" }';
      if (url.includes('sha-index')) content = 'console.log("hello");';
      if (url.includes('sha-readme')) content = '# Readme';

      await route.fulfill({
        status: 200,
        contentType: 'text/plain', // raw content
        body: content,
      });
    });

    await page.goto('/');
  });

  test('Scenario 1: Auto-Detection UI', async ({ page }) => {
    // Enter URL
    await page.getByLabel('GitHub URL').fill(MOCK_REPO_URL);
    await page.getByRole('button', { name: 'Fetch Directory Structure' }).click();

    // Verify File Tree appears (look for a file)
    await expect(page.getByText('package.json')).toBeVisible();

    // Verify "Auto-detected: Node.js"
    // The badge might be "Node.js / TypeScript" based on heuristics.ts names.
    // heuristics.ts: name: 'Node.js / TypeScript'
    await expect(page.getByText('Node.js / TypeScript')).toBeVisible();
  });

  test('Scenario 2: Smart Controls Interaction', async ({ page }) => {
    await page.getByLabel('GitHub URL').fill(MOCK_REPO_URL);
    await page.getByRole('button', { name: 'Fetch Directory Structure' }).click();
    await expect(page.getByText('package.json')).toBeVisible();

    // Default is 'Standard'.
    // Standard Node.js includes README.md.
    // Locate checkbox for README.md.
    // The FileTree component renders checkboxes.
    // The label is the filename. The checkbox is likely preceding it.
    // We can find the row with "README.md" and check the checkbox state.
    // Or more robustly:
    // Assuming the checkbox is a sibling or parent.
    // In Shadcn/Radix checkbox, the `aria-checked` attribute is on the button (checkbox role).

    // Let's look for the checkbox associated with README.md.
    // It might be tricky without explicit test ids.
    // But typically it's a row: [Checkbox] [Icon] [Name]

    // Let's assume we can find the checkbox by accessible name if label is associated,
    // or by traversing DOM.
    // For now, I'll try to find the checkbox near the text.
    // Note: The file tree might NOT use labels for checkboxes properly linking them.

    // Strategy: Use visual layout selectors or proximity.
    // Or simpler: Check if the file is in the "Selected Files" list?
    // The UI doesn't explicitly list selected files textually unless we look at "Selected Files (x)".

    // Wait, let's check if we can verify "checked" state.
    // I'll try to find the checkbox role inside the tree item.

    // A better way might be to verify the "Generate Text" button or some summary.
    // But the requirement is "Verify that the checkbox for README.md becomes unchecked".

    // Let's try to find the checkbox by locating the tree node.
    // I will assume the structure is common.
    // We can debug this if it fails.

    // Change Precision to 'Core'.
    // Slider or Tabs? The prompt says "Smart Controls... Precision Slider".
    // Let's find the slider.
    // It might be a Radix Slider or Select or Tabs.
    // "Change the Precision Slider from 'Standard' to 'Core'".
    // If it's a slider, it's hard to automate "drag".
    // Maybe it's a Segmented Control (Tabs)?
    // Let's check `src/components/features/controls/SmartControls.tsx` if possible.
    // I'll assume it has labels like "Core", "Standard", "Full".

    await page.getByRole('button', { name: 'Core' }).click();

    // Assert README.md is unchecked.
    // In Core mode for Node.js, README.md is EXCLUDED.

    // I'll check for aria-checked="false" on the checkbox for README.md
    // We need to find the checkbox for README.md.
    // The file tree renders items.

    // Let's try a generic locator that finds the checkbox near the text.
    // We look for the flex row that contains the filename.
    const readmeRow = page.locator('.flex.items-center').filter({ has: page.getByText('README.md', { exact: true }) });
    const checkbox = readmeRow.getByRole('checkbox');

    await expect(checkbox).not.toBeChecked();

    // Change back to 'Full'
    await page.getByRole('button', { name: 'Full' }).click();
    await expect(checkbox).toBeChecked();
  });

  test('Scenario 3: Generation', async ({ page }) => {
    await page.getByLabel('GitHub URL').fill(MOCK_REPO_URL);
    await page.getByRole('button', { name: 'Fetch Directory Structure' }).click();
    await expect(page.getByText('package.json')).toBeVisible();

    // Click Generate
    await page.getByRole('button', { name: 'Generate Text' }).click();

    // Verify Output
    const textarea = page.locator('textarea'); // Assuming output is in a textarea
    await expect(textarea).toHaveValue(/Directory Structure:/);
    await expect(textarea).toHaveValue(/File: src\/index.ts/);
    await expect(textarea).toHaveValue(/console.log\("hello"\);/);
  });

  test('Visual Regression (Basic)', async ({ page }) => {
    await page.getByLabel('GitHub URL').fill(MOCK_REPO_URL);
    await page.getByRole('button', { name: 'Fetch Directory Structure' }).click();
    await expect(page.getByText('package.json')).toBeVisible();

    await page.getByRole('button', { name: 'Core' }).click();

    // Take screenshot
    await expect(page).toHaveScreenshot('core-mode-tree.png', {
        maxDiffPixels: 1000 // Allow some tolerance
    });
  });

});
