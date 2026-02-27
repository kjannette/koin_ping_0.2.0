
import { assertEthereumObserver } from '../protocols/ethereum/EthereumObserver.js';
import * as AlertRuleModel from '../models/AlertRuleModel.js';
import * as AlertEventModel from '../models/AlertEventModel.js';
import * as AddressModel from '../models/AddressModel.js';
import * as NotificationConfigModel from '../models/NotificationConfigModel.js';
import { ethToWei, weiGreaterThanOrEqual, weiLessThan, formatWeiAsEth } from '../shared/weiConverter.js';
import { sendDiscordNotification } from '../notifications/discordNotifier.js';

/**
 * @typedef {import('../domain/ObservedTx.js').ObservedTx} ObservedTx
 * @typedef {import('../protocols/ethereum/EthereumObserver.js').EthereumObserver} EthereumObserver
 */

export class EvaluatorService {
  /**
   * @param {EthereumObserver} ethObserver - Implementation of EthereumObserver interface
   */
  constructor(ethObserver) {
    assertEthereumObserver(ethObserver, 'ethObserver');
    this.eth = ethObserver;
  }

  /**
   * Evaluate all observations against their associated alert rules
   * @param {ObservedTx[]} observations 
   * @returns {Promise<number>} 
   */
  async evaluate(observations) {
    let alertsFired = 0;

    for (const obs of observations) {
      try {
        const fired = await this._evaluateObservation(obs);
        alertsFired += fired;
      } catch (error) {
        console.error(
          `Error evaluating observation for address ID ${obs.addressId}:`,
          error.message
        );
        // Continue processing other observations - tbd
      }
    }

    return alertsFired;
  }

  /**
   * Evaluate a single observation against all rules
   * @private
   * @param {ObservedTx} obs 
   * @returns {Promise<number>}
   */
  async _evaluateObservation(obs) {
    const rules = await AlertRuleModel.listByAddress(obs.addressId);
    let alertsFired = 0;

    for (const rule of rules) {
      // Skip disabled 
      if (!rule.enabled) {
        continue;
      }

      const matches = await this._ruleMatches(rule, obs);
      
      if (matches) {
        await this._fireAlert(rule, obs);
        alertsFired++;
      }
    }

    return alertsFired;
  }

  /**
   * Fire an alert by creating an alert event
   * @private
   * @param {Object} rule - Alert rule that matched
   * @param {ObservedTx} obs - Observed transaction that triggered it
   * @returns {Promise<void>}
   */
  async _fireAlert(rule, obs) {
    const address = await AddressModel.findById(obs.addressId);
    const addressLabel = address?.label || address?.address || 'Unknown';

    const message = this._buildMessage(rule, obs);
    const txHash = obs.hash;
    await AlertEventModel.create(rule.id, message, addressLabel, txHash);

    console.log(
      `[ALERT FIRED] Rule ${rule.id} (${rule.type}) - ${message} - TX: ${txHash}`
    );

    // Send Discord notification if configured
    try {
      const user_id = address.user_id;
      const notificationConfig = await NotificationConfigModel.getConfig(user_id);

      if (
        notificationConfig?.discord_webhook_url &&
        notificationConfig.notification_enabled
      ) {
        const sent = await sendDiscordNotification(
          notificationConfig.discord_webhook_url,
          message,
          {
            txHash,
            addressLabel,
            alertType: rule.type,
            address: address.address,
          }
        );

        if (sent) {
          console.log(`Discord notification sent to user ${user_id}`);
        } else {
          console.warn(`Discord notification failed for user ${user_id}`);
        }
      }
    } catch (notificationError) {
      // Don't fail the alert if notification fails
      console.error(
        `Failed to send Discord notification:`,
        notificationError.message
      );
    }
  }

  /**
   * Check if a rule matches an observation
   * @private
   * @param {Object} rule - Alert rule to evaluate
   * @param {ObservedTx} obs - Observed transaction
   * @returns {Promise<boolean>} True if rule conditions are met
   */
  async _ruleMatches(rule, obs) {
    switch (rule.type) {
      case 'incoming_tx':
        return this._matchesIncomingTx(obs);

      case 'outgoing_tx':
        return this._matchesOutgoingTx(obs);

      case 'large_transfer':
        return this._matchesLargeTransfer(rule, obs);

      case 'balance_below':
        return await this._matchesBalanceBelow(rule, obs);

      default:
        console.warn(`Unknown rule type: ${rule.type}`);
        return false;
    }
  }

  /**
   * Match incoming transaction rule
   * @private
   */
  _matchesIncomingTx(obs) {
    return obs.direction === 'incoming';
  }

  /**
   * Match outgoing transaction rule
   * @private
   */
  _matchesOutgoingTx(obs) {
    return obs.direction === 'outgoing';
  }

  /**
   * Match large transfer rule
   * @private
   * 
   * IMPORTANT: Threshold is stored as ETH in DB, but we compare in Wei
   * for precision. Both incoming and outgoing transfers are checked.
   */
  _matchesLargeTransfer(rule, obs) {
    if (!rule.threshold) {
      return false;
    }

    const thresholdWei = ethToWei(Number(rule.threshold));
    const transferValueWei = obs.value;

    return weiGreaterThanOrEqual(transferValueWei, thresholdWei);
  }

  /**
   *  balance below threshold rule
   * @private
   * 
   * OPTIMIZATION: Only check balance after outgoing transactions
   * (incoming transactions increase balance, so can't trigger this alert)
   * 
   * IMPORTANT: Threshold stored as ETH in DB, but compared in Wei.
   */
  async _matchesBalanceBelow(rule, obs) {
    if (!rule.threshold) {
      return false;
    }

    if (obs.direction !== 'outgoing') {
      return false;
    }

    const address = await AddressModel.findById(obs.addressId);
    if (!address) {
      console.warn(`Address ID ${obs.addressId} not found`);
      return false;
    }

    const balanceWei = await this.eth.getBalance(address.address);

    // Convert ETH threshold from DB to Wei for comparison
    const thresholdWei = ethToWei(Number(rule.threshold));


    return weiLessThan(balanceWei, thresholdWei);
  }

  /**
   * Build a human-readable alert message
   * @private
   * @param {Object} rule - Alert rule that matched
   * @param {ObservedTx} obs - Observed transaction
   * @returns {string} Human-readable message
   */
  _buildMessage(rule, obs) {
    switch (rule.type) {
      case 'incoming_tx':
        return `Incoming transaction: ${formatWeiAsEth(obs.value)} received`;

      case 'outgoing_tx':
        return `Outgoing transaction: ${formatWeiAsEth(obs.value)} sent`;

      case 'large_transfer':
        return `Large transfer detected: ${formatWeiAsEth(obs.value)} (threshold: ${rule.threshold} ETH)`;

      case 'balance_below':
        return `Balance dropped below threshold of ${rule.threshold} ETH`;

      default:
        return 'Alert triggered';
    }
  }
}

/**
 * Factory function to create an EvaluatorService instance
 * @param {EthereumObserver} ethObserver - Implementation of EthereumObserver interface
 * @returns {EvaluatorService}
 */
export function createEvaluatorService(ethObserver) {
  return new EvaluatorService(ethObserver);
}

