/**
 * https://discord.com/developers/docs/resources/webhook#execute-webhook
 */

/**
 * Send an alert notification to webhook
 * @param {string} webhookUrl - Discord webhook URL
 * @param {string} message - Alert message
 * @param {Object} metadata - Additional alert metadata
 * @param {string} metadata.txHash - Transaction hash (nullable)
 * @param {string} metadata.addressLabel - Address label
 * @param {string} metadata.alertType - Alert type
 * @param {string} metadata.address - Blockchain address
 * @returns {Promise<boolean>} True if sent successfully, false otherwise
 */
export async function sendDiscordNotification(webhookUrl, message, metadata) {
  const { txHash, addressLabel, alertType, address } = metadata;

  try {
    const payload = {
      content: null, 
      embeds: [
        {
          title: 'Koin Ping Alert',
          description: message,
          color: getColorForAlertType(alertType),
          fields: [
            {
              name: 'Address',
              value: addressLabel || 'Unknown',
              inline: true,
            },
            {
              name: 'Blockchain Address',
              value: `\`${address}\``,
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Koin Ping',
          },
        },
      ],
    };

    if (txHash) {
      payload.embeds[0].fields.push({
        name: 'Transaction',
        value: `[View on Etherscan](https://etherscan.io/tx/${txHash})`,
        inline: false,
      });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Discord webhook failed: HTTP ${response.status} - ${errorText}`
      );
    }

    return true;
  } catch (error) {
    console.error('Failed to send Discord notification:', error.message);
    return false;
  }
}

/**
 * Get Discord embed color based on alert type
 * @param {string} alertType - Alert type
 * @returns {number} 
 */
function getColorForAlertType(alertType) {
  const colors = {
    incoming_tx: 0x00ff00, // Green - incoming money
    outgoing_tx: 0xff9900, // Orange - outgoing money
    large_transfer: 0xff0000, // Red - large movement
    balance_below: 0xff0000, // Red - low balance warning
  };

  return colors[alertType] || 0x0099ff; 
}

/**
 * Sends a  test message to verify webhook works
 * @param {string} webhookUrl 
 * @returns {Promise<boolean>} 
 */
export async function testDiscordWebhook(webhookUrl) {
  try {
    const payload = {
      content: 'Koin Ping test notification - Your Discord webhook is configured correctly!',
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('Discord webhook test failed:', error.message);
    return false;
  }
}

