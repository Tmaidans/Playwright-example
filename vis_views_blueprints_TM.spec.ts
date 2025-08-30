import { Locator, test, expect, Page } from "@playwright/test";
import * as appUtils from "../src/webApp/settingsFunctions";
import * as appLocators from "../src/webApp/settingsObjects";
import * as fs from "fs";
import * as visUtils from "../src/Visibility/visFunctions";
import * as visLocators from "../src/Visibility/visElements";
import * as login from "../src/loginSwitchFunctions"; // Import the authenticate function
import { sidebar } from "../src/sidebarNavigationElements";
import * as path from "path";
import * as os from "os";

//! ------------------------------------------------------------------------------------------------
/*
 * //? FEATURES TESTED:
 *      //? 1. Device Selection Validation:
 *              - Verify that individual device checkboxes can be selected and deselected.
 *              - Validate the UI counter for selected devices matches the number of selected checkboxes.
 *              - Test the "Select All" and "Clear" buttons to ensure proper functionality.
 *
 *      //? 2. Blueprint Assignment for a Single Device:
 *              - Extract all blueprint names from the dropdown.
 *              - Select a new blueprint for a single device.
 *              - Verify that the blueprint change is reflected in the UI after reloading the page.
 *              - Validate that the blueprint change can be canceled using the "Cancel" button.
 *
 *      //? 3. Blueprint Assignment for All Devices:
 *              - Select all devices using the "Select All" checkbox.
 *              - Extract all blueprint names from the dropdown.
 *              - Assign a new blueprint to all devices that is not currently assigned.
 *              - Verify that the blueprint change is reflected in the UI after reloading the page.
 *
 *      //? 4. Blueprint Reversion:
 *              - Revert each device back to its original blueprint using the saved blueprint data.
 *              - Handle scenarios where popups interfere with dropdown interactions.
 *              - Verify that all devices are reverted to their original blueprints after reloading the page.
 *
 *      //? 5. Retry Logic for Assertions:
 *              - Implement retry logic for assertions to handle cases where the page does not load properly.
 *              - Reload the page and retry fetching data if assertions fail.
 *              - Include a countdown timer in the terminal for better visibility during retries.
 *
 *      //? 6. Popup Handling:
 *              - Detect and close popups that appear during blueprint assignment or reversion.
 *              - Ensure that interactions with dropdowns and checkboxes are retried if interrupted by popups.
 *
 *
 * //? STEPS PERFORMED:
 *  1. Navigate to the application and switch to the "Views" tab.
 *  2. Count the number of devices in the table and log the count.
 *  3. Validate individual device selection:
 *      - Select each device checkbox and verify the UI counter matches the number of selected devices.
 *      - Deselect all devices using the "Select All" checkbox and verify the UI counter is hidden.
 *  4. Validate "Select All" and "Clear" buttons:
 *      - Select all devices using the "Select All" checkbox and verify all checkboxes are selected.
 *      - Click the "Clear" button to uncheck all devices and verify all checkboxes are deselected.
 *  5. Extract blueprint names from the table and dropdown:
 *      - Save the current blueprint names for all devices.
 *      - Extract all blueprint names from the dropdown for later use.
 *  6. Assign a new blueprint to a single device:
 *      - Select a new blueprint for the first device that is not currently assigned.
 *      - Verify the blueprint change is reflected in the UI after reloading the page.
 *      - Cancel the blueprint change using the "Cancel" button and verify the blueprint remains unchanged.
 *  7. Assign a new blueprint to all devices:
 *      - Select all devices and assign a new blueprint that is not currently assigned.
 *      - Verify the blueprint change is reflected in the UI after reloading the page.
 *  8. Revert all devices to their original blueprints:
 *      - Iterate through each device and revert it to its original blueprint.
 *      - Handle scenarios where popups interfere with dropdown interactions.
 *      - Verify that all devices are reverted to their original blueprints after reloading the page.
 *  9. Implement retry logic for assertions:
 *      - Retry fetching table data and performing assertions if the page does not load properly.
 *      - Reload the page and retry up to a maximum number of attempts.
 *      - Include a countdown timer in the terminal for better visibility during retries.
 * 10. Handle popups:
 *      - Detect and close popups that appear during blueprint assignment or reversion.
 *      - Retry interactions with dropdowns and checkboxes if interrupted by popups.
 *
 *
 * Key Assertions:
 *  - The UI counter for selected devices matches the number of selected checkboxes.
 *  - The blueprint name for a single device is updated correctly after assignment.
 *  - The blueprint name for all devices is updated correctly after assignment.
 *  - All devices are reverted to their original blueprints after reversion.
 *  - Retry logic ensures that assertions pass even if the page does not load properly on the first attempt.
 *  - Popups are handled gracefully, and interactions are retried if interrupted.
 *
 * If any assertion fails (e.g., mismatched blueprint names, incorrect UI counter, or failed retries),
 * the test will fail, indicating an issue with the UI functionality or backend updates.
 */
//! ------------------------------------------------------------------------------------------------

test("Blueprint Assignment @smoke", async ({ page }) => {
  test.setTimeout(60_000); // Allow for longer test execution times

  // Variables
  const viewsTable = visLocators.viewsTableLocator(page);
  const deviceCheckBox = visLocators.checkBoxForDevice(page);
  //popUps

  // Navigate to the page
  await page.goto(process.env.tenantURL!);

  // Switch to the "Views" tab
  await visUtils.switchTab(page, "Views");

  //?----------------------------------------------------------------⬇ Count how many devices we have⬇----------------------------------------------------------------------------
  // Get original table headers
  const { headersTable: originalHeaders, rowsTable: originalRows } =
    await visUtils.getTableData(viewsTable);

  // Count the number of rows in the table
  const deviceCount = originalRows.length;
  console.log(`Number of devices: ${deviceCount}`);

  //?----------------------------------------------------------------⬇ Check box validation + uncheck all boxes⬇----------------------------------------------------------------------------
  for (let i = 1; i <= deviceCount; i++) {
    // Select the checkbox for the current device (nth starts from 1 for individual devices)
    const currentDeviceCheckBox = deviceCheckBox.nth(i);

    // Click the checkbox to select the device
    await currentDeviceCheckBox.click();
    console.log(`Checked checkbox for device ${i}`);

    // Verify that the checkbox is checked
    await expect(currentDeviceCheckBox).toBeChecked();

    // Pull the text from the "selected" element
    const numberOfSelectedDevices = await visLocators
      .numberOfSelectedDevices(page)
      .innerText();
    console.log(`UI counter says: ${numberOfSelectedDevices}`);

    // Assert that the number of selected devices matches the current iteration
    expect(parseInt(numberOfSelectedDevices)).toBe(i); //parese int to convert string to number
  }

  // Uncheck all devices by clicking the "Select All" checkbox (nth(0))
  const selectAllCheckBox = deviceCheckBox.nth(0);
  await selectAllCheckBox.click();
  console.log("Unchecked all devices");

  // Verify that no devices are selected
  await expect(visLocators.numberOfSelectedDevices(page)).toBeHidden();
  console.log(`UI device counter is not visible`);

  //?----------------------------------------------------------------⬇ Check all boxes + reset button⬇----------------------------------------------------------------------------
  // Click the "Select All" checkbox to check all devices
  await selectAllCheckBox.click();
  console.log("Clicked 'Select All' checkbox to check all devices");

  // Verify that each checkbox is selected
  for (let i = 1; i <= deviceCount; i++) {
    const currentDeviceCheckBox = deviceCheckBox.nth(i);
    await expect(currentDeviceCheckBox).toBeChecked();
    console.log(`Verified that checkbox for device ${i} is checked`);
  }

  // Click the reset button to uncheck all devices
  const clearButton = visLocators.clearSelectedDevicesButton(page); // Locator for the reset button
  await clearButton.click();
  console.log("Clicked the clear button to uncheck all devices");

  // Verify that each checkbox is unchecked
  for (let i = 1; i <= deviceCount; i++) {
    const currentDeviceCheckBox = deviceCheckBox.nth(i);
    await expect(currentDeviceCheckBox).not.toBeChecked();
    console.log(`Verified that checkbox for device ${i} is unchecked`);
  }
   //?----------------------------------------------------------------⬇ Pull data from UI table and extract all blueprint names to use later ⬇----------------------------------------------------------------------------
  const allTableValuesAsMap = await visUtils.getMappedTableData(
    visLocators.viewsTableLocator(page) // Get all data as a map
  );
  
  // Extract all blueprint names as an array
  const defaultBlueprintArray = allTableValuesAsMap.map(
    (row) => row["Blueprint Name"]
  );
  console.log("All Blueprint Names: ", defaultBlueprintArray);
  
  // Check if the first and second devices have the expected blueprint names
  const firstDeviceBlueprint = defaultBlueprintArray[0];
  const secondDeviceBlueprint = defaultBlueprintArray[1];
  
  if (
    firstDeviceBlueprint !== "DDM1" ||
    secondDeviceBlueprint !== "Default Blueprint"
  ) {
    throw new Error(
      `RESTORE TO 0 STATE -> 1st Device: Blueprint Name: DDM1, 2nd Device: Blueprint Name: Default Blueprint\n` +
      `Current State -> 1st Device: Blueprint Name: ${firstDeviceBlueprint}, 2nd Device: Blueprint Name: ${secondDeviceBlueprint}`
    );
  }
  
  console.log("Blueprint names for the first two devices are in the expected state.");


  //?----------------------------------------------------------------⬇ Cancel Change blueprint for the first device  ⬇----------------------------------------------------------------------------
  var firstDeviceCheckBox = deviceCheckBox.nth(1); // Select the first device
  await firstDeviceCheckBox.click();

  // Click the "Change Blueprint" button
  var changeBlueprintButton =
    visLocators.blueprintsViews.changeBlueprintButton(page); // Locator for the "Change Blueprint" button
  await changeBlueprintButton.click();

  // Click the dropdown to display all blueprint options
  var blueprintDropdown = visLocators.blueprintsViews.blueprintDropdown(page);
  await blueprintDropdown.click();

  // Extract all blueprint names from the dropdown
  var blueprintDropdownLocator = page.getByRole("listbox"); // Using getByRole with the "listbox" role
  var dropdownBlueprintlistRaw = await blueprintDropdownLocator.allInnerTexts();

  // Split the raw dropdown text into an array of blueprint names
  var dropdownBlueprintlist = dropdownBlueprintlistRaw[0].split("\n");
  console.log("Blueprints from dropdown (separated): ", dropdownBlueprintlist);

  // Find the first blueprint name that does not match the current blueprint
  var currentBlueprint = defaultBlueprintArray[0]; // Current blueprint of the first device
  var newBlueprint = dropdownBlueprintlist.find(
    (blueprint) => blueprint !== currentBlueprint
  );

  if (newBlueprint) {
    // Select the new blueprint
    await page.getByRole("option", { name: newBlueprint }).click();
    console.log(`Selected new blueprint: ${newBlueprint}`);
  } else {
    console.log("No new blueprint found to select");
  }

  //?----------------------------------------------------------------⬇ Cancel Change Section with "Cancel" button ⬇----------------------------------------------------------------------------

  // Click the "Cancel" button to discard the blueprint change
  const cancelButton = visLocators.blueprintsViews.cancelButton(page); // Locator for the "Cancel" button
  await cancelButton.click();
  console.log("Clicked the 'Cancel' button to discard the blueprint change");

  // Verify that the blueprint name for the first device remains unchanged
  var updatedTableValuesAsMap = await visUtils.getMappedTableData(
    visLocators.viewsTableLocator(page) // Get the updated table data
  );

  // Extract the blueprint name for the first device after canceling
  var updatedBlueprintName = updatedTableValuesAsMap[0]["Blueprint Name"];
  console.log(
    "Blueprint Name for the first device after canceling: ",
    updatedBlueprintName
  );

  // Assert that the blueprint name remains unchanged
  expect(updatedBlueprintName).toBe(currentBlueprint);
  console.log(
    "Verified that the blueprint name for the first device remains unchanged after canceling."
  );

  //?----------------------------------------------------------------⬇(select unique blueprint sectio) ⬇----------------------------------------------------------------------------

  // Click the "Change Blueprint" button
  changeBlueprintButton =
    visLocators.blueprintsViews.changeBlueprintButton(page); // Locator for the "Change Blueprint" button
  await changeBlueprintButton.click();

  // Click the dropdown to display all blueprint options
  blueprintDropdown = visLocators.blueprintsViews.blueprintDropdown(page);
  await blueprintDropdown.click();

  // Extract all blueprint names from the dropdown
  blueprintDropdownLocator = page.getByRole("listbox"); // Using getByRole with the "listbox" role
  dropdownBlueprintlistRaw = await blueprintDropdownLocator.allInnerTexts();

  // Split the raw dropdown text into an array of blueprint names
  dropdownBlueprintlist = dropdownBlueprintlistRaw[0].split("\n");
  console.log("Blueprints from dropdown (separated): ", dropdownBlueprintlist);

  // Find the first blueprint name that does not match the current blueprint
  currentBlueprint = defaultBlueprintArray[0]; // Current blueprint of the first device
  newBlueprint = dropdownBlueprintlist.find(
    (blueprint) => blueprint !== currentBlueprint
  );

  if (newBlueprint) {
    // Select the new blueprint
    await page.getByRole("option", { name: newBlueprint }).click();
    console.log(`Selected new blueprint: ${newBlueprint}`);
  } else {
    console.log("No new blueprint found to select");
  }

  //?----------------------------------------------------------------⬇ Cancel Change Section with "X" button ⬇----------------------------------------------------------------------------

  // Click the "Cancel" button to discard the blueprint change
  const xCloseButton = visLocators.blueprintsViews.xCloseButton(page); // Locator for the "Cancel" button
  await xCloseButton.click();
  console.log("Clicked the 'X Close' button to discard the blueprint change");

  // Verify that the blueprint name for the first device remains unchanged
  updatedTableValuesAsMap = await visUtils.getMappedTableData(
    visLocators.viewsTableLocator(page) // Get the updated table data
  );

  // Extract the blueprint name for the first device after canceling
  updatedBlueprintName = updatedTableValuesAsMap[0]["Blueprint Name"];
  console.log(
    "Blueprint Name for the first device after canceling: ",
    updatedBlueprintName
  );

  // Assert that the blueprint name remains unchanged
  expect(updatedBlueprintName).toBe(currentBlueprint);
  console.log(
    "Verified that the blueprint name for the first device remains unchanged after canceling."
  );

  //?----------------------------------------------------------------⬇ Change blueprint dynamically for 1 device ⬇----------------------------------------------------------------------------

  // Click the "Change Blueprint" button
  changeBlueprintButton =
    visLocators.blueprintsViews.changeBlueprintButton(page); // Locator for the "Change Blueprint" button
  await changeBlueprintButton.click();

  // Click the dropdown to display all blueprint options
  blueprintDropdown = visLocators.blueprintsViews.blueprintDropdown(page);
  await blueprintDropdown.click();

  // Extract all blueprint names from the dropdown
  blueprintDropdownLocator = page.getByRole("listbox"); // Using getByRole with the "listbox" role
  dropdownBlueprintlistRaw = await blueprintDropdownLocator.allInnerTexts();

  // Split the raw dropdown text into an array of blueprint names
  dropdownBlueprintlist = dropdownBlueprintlistRaw[0].split("\n");
  console.log("Blueprints from dropdown (separated): ", dropdownBlueprintlist);

  // Find the first blueprint name that does not match the current blueprint
  currentBlueprint = defaultBlueprintArray[0]; // Current blueprint of the first device
  newBlueprint = dropdownBlueprintlist.find(
    (blueprint) => blueprint !== currentBlueprint
  );

  if (newBlueprint) {
    // Select the new blueprint
    await page.getByRole("option", { name: newBlueprint }).click();
    console.log(`Selected new blueprint: ${newBlueprint}`);
  } else {
    console.log("No new blueprint found to select");
  }

  // Click the "Change" button to confirm the blueprint change
  var acceptChangeButton = visLocators.blueprintsViews.acceptChangeButton(page); // Locator for the "Change" button
  await acceptChangeButton.click();

  // Reload the page
  await page.reload();
  console.log("Page reloaded");

   // Retry logic to verify that the blueprint name for the first device has been updated
  maxRetries = 10; // Maximum number of retries
  const retryInterval = 2000; // Interval between retries in milliseconds
  let blueprintUpdated = false; // Flag to track if the blueprint is updated
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Reload the page to fetch the latest data
      await page.reload();
      console.log(`Page reloaded for attempt ${attempt + 1}`);
  
      // Fetch the updated table data
      const reloadedTableValuesAsMap = await visUtils.getMappedTableData(
        visLocators.viewsTableLocator(page) // Get the updated table data after reload
      );
  
      // Extract the blueprint name for the first device after reloading
      const reloadedBlueprintName = reloadedTableValuesAsMap[0]["Blueprint Name"];
      console.log(
        "Blueprint Name for the first device after reloading: ",
        reloadedBlueprintName
      );
  
      // Check if the blueprint name matches the newly selected blueprint
      if (reloadedBlueprintName === newBlueprint) {
        blueprintUpdated = true;
        console.log(
          "Verified that the blueprint name for the first device has been updated to the new blueprint."
        );
        break; // Exit the loop if the assertion passes
      } else {
        console.log(
          `Blueprint name does not match. Expected: ${newBlueprint}, Found: ${reloadedBlueprintName}`
        );
      }
    } catch (error) {
      console.log(
        `Error encountered during attempt ${attempt + 1}: ${error.message}`
      );
    }
  
    console.log(`Retrying... (${attempt + 1}/${maxRetries})`);
    await page.waitForTimeout(retryInterval); // Wait before retrying
  }
  
  // If the blueprint was not updated after all retries, throw an error
  if (!blueprintUpdated) {
    throw new Error(
      `Blueprint name for the first device was not updated to "${newBlueprint}" after ${maxRetries} attempts.`
    );
  }

  //?----------------------------------------------------------------⬇ Change blueprint dynamically for all devices ⬇----------------------------------------------------------------------------

  // Get the blueprint names currently assigned to all devices
  const allBlueprintNamesBeforeChange = allTableValuesAsMap.map(
    (row) => row["Blueprint Name"]
  );
  console.log(
    "Blueprint Names for all devices before change: ",
    allBlueprintNamesBeforeChange
  );

  // Click the "Select All" checkbox to check all devices
  await selectAllCheckBox.click();

  // Verify that each checkbox is selected
  for (let i = 1; i <= deviceCount; i++) {
    const currentDeviceCheckBox = deviceCheckBox.nth(i);
    await expect(currentDeviceCheckBox).toBeChecked();
    console.log(`Verified that checkbox for device ${i} is checked`);
  }

  // Click the "Change Blueprint" button
  await changeBlueprintButton.click();

  // Click the dropdown to display all blueprint options
  await blueprintDropdown.click();

  // Extract all blueprint names from the dropdown
  blueprintDropdownLocator = page.getByRole("listbox");
  dropdownBlueprintlistRaw = await blueprintDropdownLocator.allInnerTexts();
  dropdownBlueprintlist = dropdownBlueprintlistRaw[0].split("\n");
  console.log("Blueprints from dropdown (separated): ", dropdownBlueprintlist);

  // Extract all blueprint names from the dropdown
  blueprintDropdownLocator = page.getByRole("listbox");
  dropdownBlueprintlistRaw = await blueprintDropdownLocator.allInnerTexts();
  dropdownBlueprintlist = dropdownBlueprintlistRaw[0].split("\n");
  console.log("Blueprints from dropdown (separated): ", dropdownBlueprintlist);

  // Find a blueprint name that does not match any of the current blueprints
  const newBlueprintForAllDevices = dropdownBlueprintlist.find(
    (blueprint) => !allBlueprintNamesBeforeChange.includes(blueprint)
  );

  if (!newBlueprintForAllDevices) {
    throw new Error("No new blueprint found to assign to all devices");
  }

  console.log("New Blueprint for all devices: ", newBlueprintForAllDevices);

  // Select the new blueprint
  await page.getByRole("option", { name: newBlueprintForAllDevices }).nth(0).click();
  console.log(
    `Selected new blueprint for all devices: ${newBlueprintForAllDevices}`
  );

  // Click the "Change" button to confirm the blueprint change
  await acceptChangeButton.click();

  //! Regular reload does not update the page correctly

  await sidebar.blueprints(page).click();
  await page.waitForTimeout(1000); // Wait for the page to load
  await sidebar.devices(page).click();

  // Verify that all devices have the new blueprint assigned
  let assertionPassed = false; // Flag to track if the assertion passes
  let retryCount = 0; // Counter for retries
  var maxRetries = 4; // Maximum number of retries

  while (!assertionPassed && retryCount <= maxRetries) {
    try {
      console.log(`Attempt ${retryCount + 1}: Fetching table data...`);

      // Fetch the updated table data
      const newUpdatedTableValuesAsMap = await visUtils.getMappedTableData(
        visLocators.viewsTableLocator(page)
      );

      // Extract blueprint names for all devices
      const allBlueprintNamesAfterChange = newUpdatedTableValuesAsMap.map(
        (row) => row["Blueprint Name"]
      );
      console.log(
        "Blueprint Names for all devices after change: ",
        allBlueprintNamesAfterChange
      );

      // Assert that all devices have the new blueprint assigned
      allBlueprintNamesAfterChange.forEach((blueprintName) => {
        expect(blueprintName).toBe(newBlueprintForAllDevices);
      });

      console.log(
        "Verified that all devices have the new blueprint assigned successfully."
      );

      // If the assertion passes, set the flag to true
      assertionPassed = true;
    } catch (error) {
      retryCount++;
      console.log(
        `Assertion failed on attempt ${retryCount}. Reloading the page and retrying...`
      );

      // Countdown before reloading the page
      const countdownSeconds = 5; // Number of seconds for the countdown
      for (let i = countdownSeconds; i > 0; i--) {
        console.log(`Reloading the page in ${i} second(s)...`);
        await page.waitForTimeout(1000); // Wait for 1 second
      }

      // Navigate to the "Blueprints" tab
      await sidebar.blueprints(page).click();
      // Navigate to the "Devices" tab
      await sidebar.devices(page).click();
      await page.reload();
    }
  }

  if (!assertionPassed) {
    throw new Error(
      `Assertion failed after ${
        maxRetries + 1
      } attempts. `
    );
  }

  //?----------------------------------------------------------------⬇ Revert each device back to its original blueprint ⬇----------------------------------------------------------------------------

  // Iterate through each device and revert to its original blueprint
  for (let i = 0; i < deviceCount; i++) {
    const currentDeviceCheckBox = deviceCheckBox.nth(i + 1); // Select the checkbox for the current device
    await currentDeviceCheckBox.click();
    console.log(`Selected device ${i + 1} for blueprint revert`);

    // Click the "Change Blueprint" button
    await changeBlueprintButton.click();
    await page.waitForTimeout(1000); // Wait for the dropdown to load

    // Click the dropdown to display all blueprint options (retry logic because pop up deselects the checkbox)
    try {
      if (!(await blueprintDropdown.isVisible())) {
        console.log(
          "Dropdown is not visible. Checking if the checkbox is selected..."
        );

        // Verify if the checkbox is still selected
        const isCheckboxChecked = await currentDeviceCheckBox.isChecked();
        if (!isCheckboxChecked) {
          console.log("Checkbox was deselected. Reselecting the checkbox...");
          await currentDeviceCheckBox.click();
          console.log("Checkbox reselected");
        }
      }

      // Retry clicking the dropdown
      console.log("Attempting to open the blueprint dropdown...");
      await blueprintDropdown.click();
      await page.waitForTimeout(1000); // Wait for the dropdown to load
      console.log("Opened the blueprint dropdown");
    } catch (error) {
      console.log("Failed to open the blueprint dropdown. Retrying...");

      // Retry logic if the dropdown fails again
      const isCheckboxChecked = await currentDeviceCheckBox.isChecked();
      if (!isCheckboxChecked) {
        console.log(
          "Checkbox was deselected again. Reselecting the checkbox..."
        );
        await currentDeviceCheckBox.click();
        console.log("Checkbox reselected");
      }

      console.log("Retrying to open the blueprint dropdown...");
      await blueprintDropdown.click();
      await page.waitForTimeout(1000); // Wait for the dropdown to load
      console.log("Opened the blueprint dropdown after retrying");
    }

    // Select the original blueprint for the current device
    const originalBlueprint = defaultBlueprintArray[i];
    await page.getByRole("option", { name: originalBlueprint }).click();
    console.log(
      `Reverted device ${i + 1} to its original blueprint: ${originalBlueprint}`
    );

    // Click the "Change" button to confirm the blueprint change
    await acceptChangeButton.click();
    console.log("Clicked the 'Change' button to save the blueprint");

    // Wait for the popup close button to appear and close it
    try {
      const popupCloseButton = page
        .getByRole("button", { name: "fa-xmark-small" })
        .nth(2);
      await popupCloseButton.waitFor({ state: "visible", timeout: 5000 }); // Wait for the popup to appear
      await popupCloseButton.click();
      console.log("Closed the popup after reverting blueprint");
    } catch (error) {
      console.log("Popup close button not found or not visible, skipping...");
    }
  }

  // Reload the page to ensure changes are reflected
  await page.reload();
  console.log("Page reloaded");

  // Verify that all devices have been reverted to their original blueprints
  const revertedTableValuesAsMap = await visUtils.getMappedTableData(
    visLocators.viewsTableLocator(page)
  );
  const allBlueprintNamesAfterRevert = revertedTableValuesAsMap.map(
    (row) => row["Blueprint Name"]
  );
  console.log(
    "Blueprint Names for all devices after revert: ",
    allBlueprintNamesAfterRevert
  );

  // Assert that all devices have been reverted to their original blueprints
  for (let i = 0; i < deviceCount; i++) {
    expect(allBlueprintNamesAfterRevert[i]).toBe(defaultBlueprintArray[i]);
    console.log(
      `Verified that device ${
        i + 1
      } has been reverted to its original blueprint: ${
        defaultBlueprintArray[i]
      }`
    );
  }

  //page.close();
});
