import { BigInt } from "@graphprotocol/graph-ts";
import {
  VestingCreated,
  TokensClaimed,
  VestingRevoked,
} from "../generated/CAPXVesting/CAPXVesting";
import { VestingSchedule, VestingClaimTransaction } from "../generated/schema";
import {
  getOrCreateProtocol,
  getOrCreateUser,
  getOrCreateHourlySnapshot,
  getOrCreateDailySnapshot,
  updateProtocolState,
  syncSnapshots,
  ZERO_BI,
} from "./helpers";

/**
 * Handle VestingCreated event
 * Event: VestingCreated(address indexed beneficiary, uint256 totalAllocation, uint256 startTime, uint256 cliffEnd, uint256 vestingEnd)
 */
export function handleVestingCreated(event: VestingCreated): void {
  let protocol = getOrCreateProtocol();
  let beneficiaryAddress = event.params.beneficiary.toHex().toLowerCase();
  let user = getOrCreateUser(beneficiaryAddress, event.block);

  let totalAllocation = event.params.totalAllocation;
  let startTime = event.params.startTime;
  let cliffEnd = event.params.cliffEnd;
  let vestingEnd = event.params.vestingEnd;

  // Create VestingSchedule
  // ID is beneficiary address (one schedule per user)
  let schedule = new VestingSchedule(user.id);
  schedule.beneficiary = user.id;
  schedule.totalAllocation = totalAllocation;
  schedule.claimed = ZERO_BI;
  schedule.startTime = startTime;
  schedule.cliffEnd = cliffEnd;
  schedule.vestingEnd = vestingEnd;
  schedule.revoked = false;
  schedule.createdAt = event.block.timestamp;
  schedule.createdAtBlock = event.block.number;
  schedule.createdTxHash = event.transaction.hash;
  schedule.save();

  // Update Protocol
  protocol.totalVestingAllocated =
    protocol.totalVestingAllocated.plus(totalAllocation);
  protocol.activeVestingSchedules = protocol.activeVestingSchedules + 1;
  protocol.save();

  // Update User
  user.vestingAllocated = totalAllocation;
  user.vestingClaimed = ZERO_BI;
  user.hasVesting = true;
  user.lastActivityTimestamp = event.block.timestamp;
  user.lastActivityBlock = event.block.number;
  user.save();

  // Update snapshots
  let hourlySnapshot = getOrCreateHourlySnapshot(event.block);
  hourlySnapshot.save();

  let dailySnapshot = getOrCreateDailySnapshot(event.block);
  dailySnapshot.save();

  // Update protocol state and sync snapshots
  updateProtocolState(event.block);
  syncSnapshots(event.block);
}

/**
 * Handle TokensClaimed event
 * Event: TokensClaimed(address indexed beneficiary, uint256 amount, uint256 totalClaimed)
 */
export function handleTokensClaimed(event: TokensClaimed): void {
  let protocol = getOrCreateProtocol();
  let beneficiaryAddress = event.params.beneficiary.toHex().toLowerCase();
  let user = getOrCreateUser(beneficiaryAddress, event.block);

  let amount = event.params.amount;
  let totalClaimed = event.params.totalClaimed;

  // Update VestingSchedule
  let schedule = VestingSchedule.load(user.id);
  if (schedule != null) {
    schedule.claimed = totalClaimed;
    schedule.save();
  }

  // Update Protocol
  protocol.totalVestingClaimed = protocol.totalVestingClaimed.plus(amount);
  protocol.save();

  // Update User
  user.vestingClaimed = totalClaimed;
  user.lastActivityTimestamp = event.block.timestamp;
  user.lastActivityBlock = event.block.number;
  user.save();

  // Update snapshots
  let hourlySnapshot = getOrCreateHourlySnapshot(event.block);
  hourlySnapshot.vestingClaimed = hourlySnapshot.vestingClaimed.plus(amount);
  hourlySnapshot.save();

  let dailySnapshot = getOrCreateDailySnapshot(event.block);
  dailySnapshot.vestingClaimed = dailySnapshot.vestingClaimed.plus(amount);
  dailySnapshot.save();

  // Create VestingClaimTransaction
  let txId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let claimTx = new VestingClaimTransaction(txId);
  claimTx.beneficiary = user.id;
  claimTx.amount = amount;
  claimTx.totalClaimed = totalClaimed;
  claimTx.timestamp = event.block.timestamp;
  claimTx.block = event.block.number;
  claimTx.txHash = event.transaction.hash;
  claimTx.save();

  // Update protocol state and sync snapshots
  updateProtocolState(event.block);
  syncSnapshots(event.block);
}

/**
 * Handle VestingRevoked event
 * Event: VestingRevoked(address indexed beneficiary, uint256 amountClaimed, uint256 amountRevoked)
 */
export function handleVestingRevoked(event: VestingRevoked): void {
  let protocol = getOrCreateProtocol();
  let beneficiaryAddress = event.params.beneficiary.toHex().toLowerCase();
  let user = getOrCreateUser(beneficiaryAddress, event.block);

  let amountRevoked = event.params.amountRevoked;

  // Update VestingSchedule
  let schedule = VestingSchedule.load(user.id);
  if (schedule != null) {
    schedule.revoked = true;
    schedule.save();
  }

  // Update Protocol
  protocol.totalVestingRevoked =
    protocol.totalVestingRevoked.plus(amountRevoked);
  protocol.totalVestingAllocated =
    protocol.totalVestingAllocated.minus(amountRevoked);
  protocol.activeVestingSchedules = protocol.activeVestingSchedules - 1;
  protocol.save();

  // Update User
  user.vestingAllocated = user.vestingAllocated.minus(amountRevoked);
  user.hasVesting = false;
  user.lastActivityTimestamp = event.block.timestamp;
  user.lastActivityBlock = event.block.number;
  user.save();

  // Update protocol state and sync snapshots
  updateProtocolState(event.block);
  syncSnapshots(event.block);
}
