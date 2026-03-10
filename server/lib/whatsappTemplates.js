/**
 * WhatsApp message templates for StockFlow documents.
 * All messages in French, tailored for Senegalese businesses.
 */

function invoiceSent({ clientName, number, total, dueDate, companyName }) {
  const due = dueDate ? `\nDate d'echeance : ${new Date(dueDate).toLocaleDateString("fr-FR")}` : "";
  return (
    `Bonjour ${clientName},\n\n` +
    `Veuillez trouver ci-joint votre facture *${number}* d'un montant de *${formatAmount(total)}*.\n` +
    due +
    `\n\nMerci pour votre confiance.\n${companyName}`
  );
}

function quoteSent({ clientName, number, total, validUntil, companyName }) {
  const valid = validUntil ? `\nCe devis est valable jusqu'au ${new Date(validUntil).toLocaleDateString("fr-FR")}.` : "";
  return (
    `Bonjour ${clientName},\n\n` +
    `Veuillez trouver ci-joint votre devis *${number}* d'un montant de *${formatAmount(total)}*.\n` +
    valid +
    `\n\nN'hesitez pas a nous contacter pour toute question.\n${companyName}`
  );
}

function deliveryNotification({ clientName, number, deliveryDate, companyName }) {
  const date = deliveryDate ? ` le ${new Date(deliveryDate).toLocaleDateString("fr-FR")}` : " prochainement";
  return (
    `Bonjour ${clientName},\n\n` +
    `Votre commande *${number}* est en cours de livraison${date}.\n\n` +
    `Merci de votre confiance.\n${companyName}`
  );
}

function debtReminder({ clientName, number, amount, dueDate, companyName }) {
  const due = dueDate ? ` depuis le ${new Date(dueDate).toLocaleDateString("fr-FR")}` : "";
  return (
    `Bonjour ${clientName},\n\n` +
    `Nous vous rappelons que la facture *${number}* d'un montant de *${formatAmount(amount)}* reste impayee${due}.\n\n` +
    `Merci de proceder au reglement dans les meilleurs delais.\n${companyName}`
  );
}

function formatAmount(n) {
  return Number(n).toLocaleString("fr-FR") + " F";
}

module.exports = {
  invoiceSent,
  quoteSent,
  deliveryNotification,
  debtReminder,
};
