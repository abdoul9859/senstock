const cron = require("node-cron");
const logger = require("./logger");
const { checkOverdueInvoices, generateRecurringInvoices } = require("./autoReminders");

/**
 * Start all scheduled cron jobs.
 */
function startCronJobs() {
  // Run daily at 8:00 AM
  cron.schedule("0 8 * * *", async () => {
    logger.info("Running daily cron jobs...");

    await checkOverdueInvoices();
    await generateRecurringInvoices();

    logger.info("Daily cron jobs completed");
  });

  logger.info("Cron jobs scheduled (daily at 08:00)");
}

module.exports = { startCronJobs };
