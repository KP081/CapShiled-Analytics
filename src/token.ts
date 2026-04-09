import { BigInt, Address } from "@graphprotocol/graph-ts";
import { Transfer, Mint, Burn, TreasuryFee } from "../generated/CAPX/CAPX";
import {
  TransferTransaction,
  MintTransaction,
  BurnTransaction,
} from "../generated/schema";
import {
  getOrCreateProtocol,
  getOrCreateUser,
  getOrCreateHourlySnapshot,
  getOrCreateDailySnapshot,
  updateProtocolState,
  syncSnapshots,
  ZERO_BI,
} from "./helpers";

// Zero address constant
const ZERO_ADDRESS = Address.fromString(
  "0x0000000000000000000000000000000000000000",
);

/**
 * Handle Transfer event
 * Event: Transfer(address indexed from, address indexed to, uint256 value)
 *
 * Note: CAPX has 1% burn + 1% treasury fee on transfers (unless exempt)
 */
export function handleTransfer(event: Transfer): void {
  let from = event.params.from;
  let to = event.params.to;
  let value = event.params.amount;

  // Skip mint/burn transfers (handled separately)
  if (from.equals(ZERO_ADDRESS) || to.equals(ZERO_ADDRESS)) {
    return;
  }

  let protocol = getOrCreateProtocol();

  // Get or create users
  let fromAddress = from.toHex().toLowerCase();
  let toAddress = to.toHex().toLowerCase();
  let fromUser = getOrCreateUser(fromAddress, event.block);
  let toUser = getOrCreateUser(toAddress, event.block);

  // Calculate fees (1% burn + 1% treasury = 2% total)
  // Note: This is approximate - actual logic checks if exempt
  let burnAmount = value.div(BigInt.fromI32(100)); // 1%
  let treasuryAmount = value.div(BigInt.fromI32(100)); // 1%
  let netAmount = value.minus(burnAmount).minus(treasuryAmount);

  // Update Protocol
  protocol.totalTransfers = protocol.totalTransfers + 1;
  protocol.save();

  // Update From User
  fromUser.totalSent = fromUser.totalSent.plus(value);
  fromUser.capxBalance = fromUser.capxBalance.minus(value);
  fromUser.transferCount = fromUser.transferCount + 1;
  fromUser.lastActivityTimestamp = event.block.timestamp;
  fromUser.lastActivityBlock = event.block.number;
  fromUser.save();

  // Update To User
  toUser.totalReceived = toUser.totalReceived.plus(netAmount);
  toUser.capxBalance = toUser.capxBalance.plus(netAmount);
  toUser.transferCount = toUser.transferCount + 1;
  toUser.lastActivityTimestamp = event.block.timestamp;
  toUser.lastActivityBlock = event.block.number;
  toUser.save();

  // Update snapshots
  let hourlySnapshot = getOrCreateHourlySnapshot(event.block);
  hourlySnapshot.transferVolume = hourlySnapshot.transferVolume.plus(value);
  hourlySnapshot.save();

  let dailySnapshot = getOrCreateDailySnapshot(event.block);
  dailySnapshot.transferVolume = dailySnapshot.transferVolume.plus(value);
  dailySnapshot.save();

  // Create TransferTransaction
  let txId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let transfer = new TransferTransaction(txId);
  transfer.from = fromUser.id;
  transfer.to = toUser.id;
  transfer.amount = value;
  transfer.burnAmount = burnAmount;
  transfer.treasuryAmount = treasuryAmount;
  transfer.netAmount = netAmount;
  transfer.timestamp = event.block.timestamp;
  transfer.block = event.block.number;
  transfer.txHash = event.transaction.hash;
  transfer.save();

  // Update protocol state and sync snapshots
  updateProtocolState(event.block);
  syncSnapshots(event.block);
}

/**
 * Handle Mint event
 * Event: Mint(address indexed to, uint256 amount, uint256 indexed role)
 *
 * Roles: 1 = Team, 2 = Treasury, 4 = DAO
 */
export function handleMint(event: Mint): void {
  let protocol = getOrCreateProtocol();

  let to = event.params.to;
  let amount = event.params.amount;
  let role = event.params.role.toI32();

  // Update Protocol supply
  protocol.totalSupply = protocol.totalSupply.plus(amount);
  protocol.totalMinted = protocol.totalMinted.plus(amount);
  protocol.totalCirculating = protocol.totalSupply.minus(protocol.totalBurned);

  // Update role-specific minting
  if (role == 1) {
    // Team minter
    protocol.totalTeamMinted = protocol.totalTeamMinted.plus(amount);
  } else if (role == 2) {
    // Treasury minter
    protocol.totalTreasuryMinted = protocol.totalTreasuryMinted.plus(amount);
  } else if (role == 4) {
    // DAO minter
    protocol.totalDaoMinted = protocol.totalDaoMinted.plus(amount);
  }

  protocol.save();

  // Update recipient user balance
  let toAddress = to.toHex().toLowerCase();
  let user = getOrCreateUser(toAddress, event.block);
  user.capxBalance = user.capxBalance.plus(amount);
  user.lastActivityTimestamp = event.block.timestamp;
  user.lastActivityBlock = event.block.number;
  user.save();

  // Update snapshots
  let hourlySnapshot = getOrCreateHourlySnapshot(event.block);
  hourlySnapshot.mintedAmount = hourlySnapshot.mintedAmount.plus(amount);
  hourlySnapshot.save();

  let dailySnapshot = getOrCreateDailySnapshot(event.block);
  dailySnapshot.mintedAmount = dailySnapshot.mintedAmount.plus(amount);
  dailySnapshot.save();

  // Create MintTransaction
  let txId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let mintTx = new MintTransaction(txId);
  mintTx.to = to;
  mintTx.amount = amount;
  mintTx.role = role;
  mintTx.timestamp = event.block.timestamp;
  mintTx.block = event.block.number;
  mintTx.txHash = event.transaction.hash;
  mintTx.save();

  // Update protocol state and sync snapshots
  updateProtocolState(event.block);
  syncSnapshots(event.block);
}

/**
 * Handle Burn event
 * Event: Burn(address indexed from, uint256 amount)
 */
export function handleBurn(event: Burn): void {
  let protocol = getOrCreateProtocol();

  let from = event.params.from;
  let amount = event.params.amount;

  // Update Protocol
  protocol.totalBurned = protocol.totalBurned.plus(amount);
  protocol.totalSupply = protocol.totalSupply.minus(amount);
  protocol.totalCirculating = protocol.totalSupply.minus(protocol.totalBurned);
  protocol.save();

  // Update user balance
  let fromAddress = from.toHex().toLowerCase();
  let user = getOrCreateUser(fromAddress, event.block);
  user.capxBalance = user.capxBalance.minus(amount);
  user.lastActivityTimestamp = event.block.timestamp;
  user.lastActivityBlock = event.block.number;
  user.save();

  // Update snapshots
  let hourlySnapshot = getOrCreateHourlySnapshot(event.block);
  hourlySnapshot.burnedAmount = hourlySnapshot.burnedAmount.plus(amount);
  hourlySnapshot.save();

  let dailySnapshot = getOrCreateDailySnapshot(event.block);
  dailySnapshot.burnedAmount = dailySnapshot.burnedAmount.plus(amount);
  dailySnapshot.save();

  // Create BurnTransaction
  let txId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let burnTx = new BurnTransaction(txId);
  burnTx.from = user.id;
  burnTx.amount = amount;
  burnTx.timestamp = event.block.timestamp;
  burnTx.block = event.block.number;
  burnTx.txHash = event.transaction.hash;
  burnTx.save();

  // Update protocol state and sync snapshots
  updateProtocolState(event.block);
  syncSnapshots(event.block);
}

/**
 * Handle TreasuryFee event
 * Event: TreasuryFee(address indexed from, address indexed to, uint256 amount)
 *
 * This is the 1% treasury fee on transfers
 */
export function handleTreasuryFee(event: TreasuryFee): void {
  let protocol = getOrCreateProtocol();

  let amount = event.params.amount;

  // Update Protocol
  protocol.totalTreasuryFees = protocol.totalTreasuryFees.plus(amount);
  protocol.treasuryBalance = protocol.totalTreasuryFees.plus(
    protocol.totalTreasuryMinted,
  );
  protocol.save();

  // Update snapshots
  let hourlySnapshot = getOrCreateHourlySnapshot(event.block);
  hourlySnapshot.treasuryFeesCollected =
    hourlySnapshot.treasuryFeesCollected.plus(amount);
  hourlySnapshot.save();

  let dailySnapshot = getOrCreateDailySnapshot(event.block);
  dailySnapshot.treasuryFeesCollected =
    dailySnapshot.treasuryFeesCollected.plus(amount);
  dailySnapshot.save();

  // Update protocol state and sync snapshots
  updateProtocolState(event.block);
  syncSnapshots(event.block);
}
