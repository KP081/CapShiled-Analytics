import { BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import {
  Staked,
  Unstaked,
  RewardClaimed,
  Compounded,
  BaseAprUpdated,
} from "../generated/CAPXStaking/CAPXStaking";
import {
  StakePosition,
  StakeTransaction,
  UnstakeTransaction,
  ClaimTransaction,
  CompoundTransaction,
} from "../generated/schema";
import {
  getOrCreateProtocol,
  getOrCreateUser,
  getOrCreateStakePosition,
  createPositionId,
  updateUserPositionSlots,
  calculateUserTotalStaked,
  updateProtocolActiveStakers,
  updateProtocolState,
  syncSnapshots,
  getOrCreateHourlySnapshot,
  getOrCreateDailySnapshot,
  ZERO_BI,
  ONE_BI,
} from "./helpers";

// ============================================
// STAKED EVENT
// Event: Staked(indexed address user, uint256 amount, LockOption lockOption, uint256 unlockTime)
// ============================================

export function handleStaked(event: Staked): void {
  let protocol = getOrCreateProtocol();
  let userAddress = event.params.user.toHex().toLowerCase();
  let user = getOrCreateUser(userAddress, event.block);

  // Track previous state for activeStakers update
  let previousActiveCount = user.activePositionsCount;

  // Get lock option (enum -> uint8 -> i32)
  let lockOption = event.params.lockOption;
  let amount = event.params.amount;
  let unlockTime = event.params.unlockTime;

  // Create/update position
  let position = getOrCreateStakePosition(userAddress, lockOption, event.block);

  // Position should not be active already (contract prevents this)
  // But check just in case
  if (position.isActive) {
    // This shouldn't happen according to contract logic
    return;
  }

  position.amount = amount;
  position.unlockTime = unlockTime;
  position.lastClaimTime = event.block.timestamp;
  position.isActive = true;
  position.stakedAt = event.block.timestamp;
  position.stakedAtBlock = event.block.number;
  position.stakedTxHash = event.transaction.hash;

  // Calculate effective APR
  // Lock multipliers: FLEX=1.0x, 30D=1.25x, 90D=1.5x, 180D=2.0x
  let baseAPR = protocol.currentAPR;
  let multiplier = BigDecimal.fromString("1.0");

  if (lockOption == 0) {
    multiplier = BigDecimal.fromString("1.0");
  } else if (lockOption == 1) {
    multiplier = BigDecimal.fromString("1.25");
  } else if (lockOption == 2) {
    multiplier = BigDecimal.fromString("1.5");
  } else if (lockOption == 3) {
    multiplier = BigDecimal.fromString("2.0");
  }

  position.effectiveAPR = baseAPR.times(multiplier);
  position.isUnlocked = event.block.timestamp.ge(unlockTime);
  position.save();

  // Update user stats
  user.totalStaked = user.totalStaked.plus(amount);
  user.stakeTransactionCount = user.stakeTransactionCount + 1;
  user.lastActivityTimestamp = event.block.timestamp;
  user.lastActivityBlock = event.block.number;

  // Update user position slots and count
  updateUserPositionSlots(user);

  // Recalculate total staked
  user.currentTotalStaked = calculateUserTotalStaked(user);
  user.save();

  // If this is user's first position, increment activeStakers
  updateProtocolActiveStakers(
    previousActiveCount,
    user.activePositionsCount,
    protocol,
  );

  // Update protocol stats
  protocol.totalStaked = protocol.totalStaked.plus(amount);
  protocol.totalActivePositions = protocol.totalActivePositions + 1;

  // If this is user's first stake ever, increment uniqueStakers
  if (user.stakeTransactionCount == 1) {
    protocol.uniqueStakers = protocol.uniqueStakers + 1;
  }

  protocol.save();

  // Update snapshots
  let hourlySnapshot = getOrCreateHourlySnapshot(event.block);
  hourlySnapshot.stakeVolume = hourlySnapshot.stakeVolume.plus(amount);
  hourlySnapshot.newPositionsCreated = hourlySnapshot.newPositionsCreated + 1;
  if (user.stakeTransactionCount == 1) {
    hourlySnapshot.newStakers = hourlySnapshot.newStakers + 1;
  }
  hourlySnapshot.save();

  let dailySnapshot = getOrCreateDailySnapshot(event.block);
  dailySnapshot.stakeVolume = dailySnapshot.stakeVolume.plus(amount);
  dailySnapshot.newPositionsCreated = dailySnapshot.newPositionsCreated + 1;
  if (user.stakeTransactionCount == 1) {
    dailySnapshot.newStakers = dailySnapshot.newStakers + 1;
  }
  dailySnapshot.save();

  // Create transaction record
  let txId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let tx = new StakeTransaction(txId);
  tx.user = userAddress;
  tx.amount = amount;
  tx.lockOption = lockOption;
  tx.unlockTime = unlockTime;
  tx.timestamp = event.block.timestamp;
  tx.block = event.block.number;
  tx.txHash = event.transaction.hash;
  tx.save();

  // Final state update
  updateProtocolState(event.block);
  syncSnapshots(event.block);
}

// ============================================
// UNSTAKED EVENT
// Event: Unstaked(indexed address user, uint256 amount)
// NOTE: Event does NOT include lockOption, so we need to find it
// ============================================

export function handleUnstaked(event: Unstaked): void {
  let protocol = getOrCreateProtocol();
  let userAddress = event.params.user.toHex().toLowerCase();
  let user = getOrCreateUser(userAddress, event.block);

  // Track previous state for activeStakers update
  let previousActiveCount = user.activePositionsCount;

  let amount = event.params.amount;

  // Find which position was unstaked by matching amount
  // Check all 4 lock options
  let lockOption = -1;
  let position: StakePosition | null = null;

  for (let i = 0; i < 4; i++) {
    let posId = createPositionId(userAddress, i);
    let pos = StakePosition.load(posId);

    if (pos != null && pos.isActive && pos.amount.equals(amount)) {
      lockOption = i;
      position = pos;
      break;
    }
  }

  if (position == null || lockOption == -1) {
    // Position not found - this shouldn't happen
    // Log and return
    return;
  }

  // Calculate any pending rewards (if any - contract auto-claims on unstake)
  let lastClaimTime = position.lastClaimTime;
  let elapsed = event.block.timestamp.minus(lastClaimTime);
  let rewardsClaimed = ZERO_BI;

  // Simplified reward calculation (actual calculation is in contract)
  // This is just for tracking purposes
  if (elapsed.gt(ZERO_BI)) {
    // We'll set rewardsClaimed to 0 since contract handles it
    // The actual amount will be in the RewardClaimed event if emitted
    rewardsClaimed = ZERO_BI;
  }

  // Deactivate position
  position.isActive = false;
  position.save();

  // Update user stats
  user.totalUnstaked = user.totalUnstaked.plus(amount);
  user.unstakeTransactionCount = user.unstakeTransactionCount + 1;
  user.lastActivityTimestamp = event.block.timestamp;
  user.lastActivityBlock = event.block.number;

  // Update user position slots and count
  updateUserPositionSlots(user);

  // Recalculate total staked
  user.currentTotalStaked = calculateUserTotalStaked(user);
  user.save();

  // ✅ UPDATE ACTIVE STAKERS
  // If this was user's last position, decrement activeStakers
  updateProtocolActiveStakers(
    previousActiveCount,
    user.activePositionsCount,
    protocol,
  );

  // Update protocol stats
  protocol.totalUnstaked = protocol.totalUnstaked.plus(amount);
  protocol.totalActivePositions = protocol.totalActivePositions - 1;
  protocol.save();

  // Update snapshots
  let hourlySnapshot = getOrCreateHourlySnapshot(event.block);
  hourlySnapshot.unstakeVolume = hourlySnapshot.unstakeVolume.plus(amount);
  hourlySnapshot.positionsUnstaked = hourlySnapshot.positionsUnstaked + 1;
  hourlySnapshot.save();

  let dailySnapshot = getOrCreateDailySnapshot(event.block);
  dailySnapshot.unstakeVolume = dailySnapshot.unstakeVolume.plus(amount);
  dailySnapshot.netStakeFlow = dailySnapshot.stakeVolume.minus(
    dailySnapshot.unstakeVolume,
  );
  dailySnapshot.positionsUnstaked = dailySnapshot.positionsUnstaked + 1;
  dailySnapshot.save();

  // Create transaction record
  let txId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let tx = new UnstakeTransaction(txId);
  tx.user = userAddress;
  tx.amount = amount;
  tx.lockOption = lockOption;
  tx.rewardsClaimed = rewardsClaimed;
  tx.timestamp = event.block.timestamp;
  tx.block = event.block.number;
  tx.txHash = event.transaction.hash;
  tx.save();

  // Final state update
  updateProtocolState(event.block);
  syncSnapshots(event.block);
}

// ============================================
// REWARD CLAIMED EVENT
// Event: RewardClaimed(indexed address user, uint256 reward)
// NOTE: Event does NOT include lockOption
// ============================================

export function handleRewardClaimed(event: RewardClaimed): void {
  let protocol = getOrCreateProtocol();
  let userAddress = event.params.user.toHex().toLowerCase();
  let user = getOrCreateUser(userAddress, event.block);

  let reward = event.params.reward;

  // Update user stats
  user.totalRewardsClaimed = user.totalRewardsClaimed.plus(reward);
  user.claimTransactionCount = user.claimTransactionCount + 1;
  user.lastActivityTimestamp = event.block.timestamp;
  user.lastActivityBlock = event.block.number;
  user.save();

  // Update protocol stats
  protocol.totalRewardsClaimed = protocol.totalRewardsClaimed.plus(reward);
  protocol.save();

  // Update snapshots
  let hourlySnapshot = getOrCreateHourlySnapshot(event.block);
  hourlySnapshot.rewardsClaimed = hourlySnapshot.rewardsClaimed.plus(reward);
  hourlySnapshot.save();

  let dailySnapshot = getOrCreateDailySnapshot(event.block);
  dailySnapshot.rewardsClaimed = dailySnapshot.rewardsClaimed.plus(reward);
  dailySnapshot.save();

  // Create transaction record
  let txId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let tx = new ClaimTransaction(txId);
  tx.user = userAddress;
  tx.reward = reward;
  tx.lockOption = -1; // Unknown - event doesn't specify
  tx.timestamp = event.block.timestamp;
  tx.block = event.block.number;
  tx.txHash = event.transaction.hash;
  tx.save();

  // Final state update
  updateProtocolState(event.block);
  syncSnapshots(event.block);
}

// ============================================
// COMPOUNDED EVENT
// Event: Compounded(indexed address user, uint256 rewardAdded)
// NOTE: Event does NOT include lockOption
// ============================================

export function handleCompounded(event: Compounded): void {
  let protocol = getOrCreateProtocol();
  let userAddress = event.params.user.toHex().toLowerCase();
  let user = getOrCreateUser(userAddress, event.block);

  let rewardAdded = event.params.rewardAdded;

  // Update user stats
  user.totalCompounded = user.totalCompounded.plus(rewardAdded);
  user.compoundTransactionCount = user.compoundTransactionCount + 1;
  user.lastActivityTimestamp = event.block.timestamp;
  user.lastActivityBlock = event.block.number;
  user.save();

  // Update protocol stats
  // Compounding adds to totalStaked (rewards become principal)
  protocol.totalStaked = protocol.totalStaked.plus(rewardAdded);
  protocol.totalCompounded = protocol.totalCompounded.plus(rewardAdded);
  protocol.save();

  // Update snapshots
  let hourlySnapshot = getOrCreateHourlySnapshot(event.block);
  hourlySnapshot.compounded = hourlySnapshot.compounded.plus(rewardAdded);
  hourlySnapshot.save();

  let dailySnapshot = getOrCreateDailySnapshot(event.block);
  dailySnapshot.compounded = dailySnapshot.compounded.plus(rewardAdded);
  dailySnapshot.save();

  // Create transaction record
  let txId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let tx = new CompoundTransaction(txId);
  tx.user = userAddress;
  tx.rewardAdded = rewardAdded;
  tx.lockOption = -1; // Unknown - event doesn't specify
  tx.newTotalStaked = user.currentTotalStaked.plus(rewardAdded);
  tx.timestamp = event.block.timestamp;
  tx.block = event.block.number;
  tx.txHash = event.transaction.hash;
  tx.save();

  // Final state update
  updateProtocolState(event.block);
  syncSnapshots(event.block);
}

// ============================================
// BASE APR UPDATED EVENT
// Event: BaseAprUpdated(uint256 oldAprBps, uint256 newAprBps)
// ============================================

export function handleBaseAprUpdated(event: BaseAprUpdated): void {
  let protocol = getOrCreateProtocol();

  // Convert basis points to percentage
  // 1200 bps = 12.00%
  let newAprBps = event.params.newAprBps;
  let aprPercent = newAprBps.toBigDecimal().div(BigDecimal.fromString("100"));

  protocol.currentAPR = aprPercent;
  protocol.save();

  // Update snapshots
  updateProtocolState(event.block);
  syncSnapshots(event.block);
}
