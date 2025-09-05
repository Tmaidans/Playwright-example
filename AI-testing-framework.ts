test("Kai - Question dynamic validation", async ({ page }) => {
  test.setTimeout(1200_000);

  //Variables
  const editColumnsButton = visLocators.editColumns.editColumnsButton(page);
  const addHiddenColumnButton =
    visLocators.editColumns.addHiddenColumnButton(page);
  const saveWithoutLeavingButton = page.getByRole("button", {
    name: "Leave without saving",
  });
  const allColumnsVisibleMessage = page.locator(
    '//h1[contains(text(), "All columns are visible")]'
  );
  const questionKeys = [
    //?Insights for dashboard, suggestions based on status. Testing insights

    /**
    "Q1", //Bluerint question
    "Q1",
    /** 
    "Q2",
    "Q3",
    "Q4",
    "Q6",
    "Q7",
    "Q8",
    "Q9", //--
    "Q10",
    "Q11",
    "Q12",
    "Q13",
    "Q14",
    "Q15",
    "Q16",
    "Q17", //--
    "Q18",
    "Q19",

    "Q20",
   */
    "Q21",
    "Q22",
    "Q23", //--
    "Q24",
    "Q25",
    "Q26",
    "Q27",
    "Q28",
    "Q29",
    "Q30",
    "Q31",
    "Q32",
    "Q33",
    "Q34",
    "Q35",
    "Q5",
    "Q36",

    /** 
    //Blueprint Questions
    "Q37",
    "Q38",
    "Q39",
    "Q40"
    */
    //multi action qiestions
  ]; // Add more question keys as needed
  const fileName = "Kai_Test_Results.csv";
  const applyButton = visLocators.editColumns.applyButton(page);
  const sendBtn = visLocators.kai.kaiSendChatButton(page);
  const latest = kaiElements.kaiLatestResponse(page);
  const links = kaiElements.prismLink(page);
  var numberOfQuestions = questionKeys.length;
  var numberOfCorrectAnswers = 0;

  // Array to store response times
  const responseTimes: { question: string; time: number }[] = [];

  //? --------------------------------⬇ Loop through questions ⬇-----------------------------

  for (const questionKey of questionKeys) {
    await page.goto(process.env.tenantURL!);
    const kaiQuestion = kaiFunctions.getKaiQuestion(questionKey);
    //console.log("Kai question:", kaiQuestion.question); //! ADD TO GET LOGS

    //? --------------------------------⬇ Wait for response and parse the response ⬇-----------------------------

    // Ask current question
    const { question: qText } = kaiFunctions.getKaiQuestion(questionKey);
    await navigateToKai(page);
    await sendMessageToKai(page, qText, sendBtn);

    // Measure response time
    const elapsed = await waitForLoadingIndicator(page);
    responseTimes.push({ question: questionKey, time: elapsed });
    console.log(`⏱ Response time for ${questionKey}: ${elapsed}s`);

    const kaiResponse = await latest.innerText();
    //console.log("Kai response:", kaiResponse); //! ADD TO GET LOGS

    //? --------------------------------⬇ follow the link and get UI data for validation ⬇-----------------------------

    // Check if Kai's response contains "Sorry"
    if (kaiResponse.includes("Sorry")) {
      console.log(
        `Skipping validation for question "${questionKey}" because Kai was not able to provide an answer.`
      );
      let isAccurate = !true;
      const reason = "Kai was not able to provide an answer";
      console.log(`Question: ${qText}`);
      console.log("Answer is accurate:", false);
      console.log(`Reason: ${reason}`);

      // Build your CSV data object
      const data = {
        DateTime: new Date().toLocaleString(), // e.g. "5/6/2025, 9:36:04 AM"
        Question: qText, // the question you sent
        KaiAnswer: kaiResponse, // Kai’s raw answer
        IsAccurate: "False", // true or false
        ResponseTime: elapsed, // in seconds (number)
        "AI Comment": reason, // AI's comment on accuracy
      };

      // Then call your new saveDataToCSV:
      await saveDataToCSV(data, fileName);
      continue; // Skip the iteration
    }

    // Snapshot Certificates table
    await links.first().click();

    // Check for and handle the "Leave without saving" modal if it appears
    if (await saveWithoutLeavingButton.isVisible()) {
      await saveWithoutLeavingButton.click();
      await page.waitForTimeout(1000); // Wait for modal to close
    }

    // Open Edit Columns modal and ensure all columns are visible
    await editColumnsButton.click();

    await page.waitForTimeout(1000); // Wait for the modal to open

    while (true) {
      if (!(await addHiddenColumnButton.isVisible())) {
        //console.log("No more hidden columns to add. Closing modal.");

        // Assertion: Validate "All columns are visible" message
        await expect(allColumnsVisibleMessage).toBeVisible();
        //console.log('"All columns are visible" message validated.');

        await applyButton.click();
        break;
      }
      await addHiddenColumnButton.click(); // Add a hidden column if available
    }

    await page.waitForTimeout(1000); //wait for the table to load with applied columns

    try {
      const certHeader = await visLocators.pageHeaderSmall(page).innerText();
      const certRows = await visUtils.getMappedTableData(
        visUtils.returnTableLocatorByText(page, certHeader)
      );

      // Log the map data for visual validation
      //console.log("\n=== Map Data for Validation ===");
      //console.log("Header:", certHeader);
      //console.log("Number of rows:", certRows.length);
      //console.log("First row sample:", certRows[0]);
      //console.log("All rows:", JSON.stringify(certRows, null, 2));
      //console.log("===========================\n");

      // Continue with validation logic if no error is thrown
      const { isAccurate, reason } = await kaiFunctions.validateKaiAnswerWithAI(
        questionKey,
        kaiResponse,
        certRows,
        certHeader
      );

      // Build your CSV data object
      const data = {
        DateTime: new Date().toLocaleString(), // e.g. "5/6/2025, 9:36:04 AM"
        Question: qText, // the question you sent
        KaiAnswer: kaiResponse, // Kai’s raw answer
        IsAccurate: isAccurate, // true or false
        ResponseTime: elapsed, // in seconds (number)
        "AI Comment": reason, // AI's comment on accuracy
      };

      // Then call your new saveDataToCSV:
      await saveDataToCSV(data, fileName);

      console.log("Question:", qText);
      console.log("Answer is accurate: ", isAccurate);
      console.log("Reason: ", reason);

      if (isAccurate === true) {
        numberOfCorrectAnswers++;
      }
    } catch (error) {
      // Check if Kai's response contains "No records were found"
      if (
        kaiResponse.includes("No records were found") ||
        kaiResponse.includes("I'm sorry, but I couldn't find any records") ||
        kaiResponse.includes("I was unable to find any") ||
        kaiResponse.includes("no records") ||
        kaiResponse.includes("There are no devices")
      ) {
        numberOfCorrectAnswers++; // Increment correct answers
        console.log(`Question: ${qText}`);
        console.log("Answer is accurate: ", true);
        console.log("Reason: Kai stated that no records were found.");

        const data = {
          DateTime: new Date().toLocaleString(), // e.g. "5/6/2025, 9:36:04 AM"
          Question: qText, // the question you sent
          KaiAnswer: kaiResponse, // Kai’s raw answer
          IsAccurate: "True", // true or false
          ResponseTime: elapsed, // in seconds (number)
          "AI Comment": "User comment: Table is empty for provided results", // AI's comment on accuracy
        };

        // Then call your new saveDataToCSV:
        await saveDataToCSV(data, fileName);
      } else {
        console.log(`Question: ${qText}`);
        console.log("Answer is accurate: ", false);
        console.log(
          `Error occurred for question "${questionKey}": ${error.message}`
        );
        console.log(
          `Skipping validation for question "${questionKey}" because Kai did not provide the correct Prism page or UI data is missing.`
        );

        const data = {
          DateTime: new Date().toLocaleString(), // e.g. "5/6/2025, 9:36:04 AM"
          Question: qText, // the question you sent
          KaiAnswer: kaiResponse, // Kai’s raw answer
          IsAccurate: "False", // true or false
          ResponseTime: elapsed, // in seconds (number)
          "AI Comment": "User comment: Table is empty for provided results", // AI's comment on accuracy
        };

        // Then call your new saveDataToCSV:
        await saveDataToCSV(data, fileName);
      }

      continue; // Skip the iteration
    }
  }
  //? --------------------------------⬇ Print response time report ⬇-----------------------------
  const totalResponseTime = responseTimes.reduce((sum, r) => sum + r.time, 0);
  const averageResponseTime = totalResponseTime / responseTimes.length;
  console.log("\n=== Response Time Report ===");
  responseTimes.forEach(({ question, time }) =>
    console.log(`Question ${question}: ${time}s`)
  );
  console.log(`Average Response Time: ${averageResponseTime.toFixed(2)}s`);

  //console.log("Number of questions: ", numberOfQuestions);
  //console.log("Number of correct answers: ", numberOfCorrectAnswers);

  var kaiAccuracy = (numberOfCorrectAnswers / numberOfQuestions) * 100;
  console.log(`Kai Accuracy: ${kaiAccuracy.toFixed(2)}%`);
});
