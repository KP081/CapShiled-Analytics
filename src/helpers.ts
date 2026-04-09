import { BigInt, BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import {
  Protocol,
  User,
  StakePosition,
  HourlySnapshot,
  DailySnapshot,
} from "../generated/schema";

// ============================================
// CONSTANTS
// ============================================

export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);
export const ZERO_BD = BigDecimal.fromString("0");

// ============================================
// PROTOCOL
// ============================================

export function getOrCreateProtocol(): Protocol {
  let protocol = Protocol.load("1");

  if (protocol == null) {
    protocol = new Protocol("1");

    // Token Supply
    protocol.totalSupply = ZERO_BI;
    protocol.totalBurned = ZERO_BI;
    protocol.totalMinted = ZERO_BI;
    protocol.totalCirculating = ZERO_BI;

    // Staking Stats
    protocol.totalStaked = ZERO_BI;
    protocol.totalUnstaked = ZERO_BI;
    protocol.totalRewardsClaimed = ZERO_BI;
    protocol.totalCompounded = ZERO_BI;
    protocol.totalActivePositions = 0;
    protocol.uniqueStakers = 0;
    protocol.activeStakers = 0;

    // Vesting Stats
    protocol.totalVestingAllocated = ZERO_BI;
    protocol.totalVestingClaimed = ZERO_BI;
    protocol.totalVestingRevoked = ZERO_BI;
    protocol.activeVestingSchedules = 0;

    // Treasury Stats
    protocol.treasuryBalance = ZERO_BI;
    protocol.totalTreasuryFees = ZERO_BI;
    protocol.totalTreasuryMinted = ZERO_BI;

    // Minting Stats
    protocol.totalTeamMinted = ZERO_BI;
    protocol.totalDaoMinted = ZERO_BI;

    // User Stats
    protocol.totalUsers = 0;
    protocol.totalTransfers = 0;

    // Computed
    protocol.totalValueLocked = ZERO_BI;
    protocol.currentAPR = BigDecimal.fromString("12.0"); // Default 12%

    // Timestamps
    protocol.lastUpdateTimestamp = ZERO_BI;
    protocol.lastUpdateBlock = ZERO_BI;

    protocol.save();
  }

  return protocol;
}

// ============================================
// USER
// ============================================

export function getOrCreateUser(address: string, block: ethereum.Block): User {
  let user = User.load(address);

  if (user == null) {
    user = new User(address);

    // Token Balance
    user.capxBalance = ZERO_BI;

    // Staking Totals
    user.totalStaked = ZERO_BI;
    user.totalUnstaked = ZERO_BI;
    user.totalRewardsClaimed = ZERO_BI;
    user.totalCompounded = ZERO_BI;

    // Current Staking State
    user.currentTotalStaked = ZERO_BI;
    user.activePositionsCount = 0;

    // Position slot flags
    user.hasFlexPosition = false;
    user.has30DPosition = false;
    user.has90DPosition = false;
    user.has180DPosition = false;

    // Vesting
    user.vestingAllocated = ZERO_BI;
    user.vestingClaimed = ZERO_BI;
    user.hasVesting = false;

    // Transfers
    user.totalSent = ZERO_BI;
    user.totalReceived = ZERO_BI;

    // Activity Counts
    user.stakeTransactionCount = 0;
    user.unstakeTransactionCount = 0;
    user.claimTransactionCount = 0;
    user.compoundTransactionCount = 0;
    user.transferCount = 0;

    // Timestamps
    user.firstSeenTimestamp = block.timestamp;
    user.firstSeenBlock = block.number;
    user.lastActivityTimestamp = block.timestamp;
    user.lastActivityBlock = block.number;

    user.save();

    // Increment total users
    let protocol = getOrCreateProtocol();
    protocol.totalUsers = protocol.totalUsers + 1;
    protocol.save();
  }

  return user;
}

// ============================================
// STAKE POSITION
// ============================================

/**
 * Create position ID from user address and lock option
 * Format: ${userAddress}-${lockOption}
 * Example: "0x123abc-0" for FLEX position
 */
export function createPositionId(userAddress: string, lockOption: i32): string {
  return userAddress + "-" + lockOption.toString();
}

/**
 * Get or create a stake position
 */
export function getOrCreateStakePosition(
  userAddress: string,
  lockOption: i32,
  block: ethereum.Block,
): StakePosition {
  let positionId = createPositionId(userAddress, lockOption);
  let position = StakePosition.load(positionId);

  if (position == null) {
    position = new StakePosition(positionId);
    position.user = userAddress;
    position.lockOption = lockOption;
    position.amount = ZERO_BI;
    position.unlockTime = ZERO_BI;
    position.lastClaimTime = block.timestamp;
    position.isActive = false;
    position.stakedAt = block.timestamp;
    position.stakedAtBlock = block.number;
    position.stakedTxHash = block.hash;
    position.effectiveAPR = ZERO_BD;
    position.isUnlocked = false;
    position.save();
  }

  return position;
}

// ============================================
// USER POSITION UPDATES
// ============================================

/**
 * Update user's position slot flags based on active positions
 * Call this after creating/removing positions
 */
export function updateUserPositionSlots(user: User): void {
  // Check each lock option
  let flexPos = StakePosition.load(createPositionId(user.id, 0));
  let days30Pos = StakePosition.load(createPositionId(user.id, 1));
  let days90Pos = StakePosition.load(createPositionId(user.id, 2));
  let days180Pos = StakePosition.load(createPositionId(user.id, 3));

  user.hasFlexPosition = flexPos != null && flexPos.isActive;
  user.has30DPosition = days30Pos != null && days30Pos.isActive;
  user.has90DPosition = days90Pos != null && days90Pos.isActive;
  user.has180DPosition = days180Pos != null && days180Pos.isActive;

  // Count active positions
  let count = 0;
  if (user.hasFlexPosition) count++;
  if (user.has30DPosition) count++;
  if (user.has90DPosition) count++;
  if (user.has180DPosition) count++;

  user.activePositionsCount = count;
  user.save();
}

/**
 * Calculate user's total staked amount across all positions
 */
export function calculateUserTotalStaked(user: User): BigInt {
  let total = ZERO_BI;

  // Sum all active positions
  let flexPos = StakePosition.load(createPositionId(user.id, 0));
  let days30Pos = StakePosition.load(createPositionId(user.id, 1));
  let days90Pos = StakePosition.load(createPositionId(user.id, 2));
  let days180Pos = StakePosition.load(createPositionId(user.id, 3));

  if (flexPos != null && flexPos.isActive) {
    total = total.plus(flexPos.amount);
  }
  if (days30Pos != null && days30Pos.isActive) {
    total = total.plus(days30Pos.amount);
  }
  if (days90Pos != null && days90Pos.isActive) {
    total = total.plus(days90Pos.amount);
  }
  if (days180Pos != null && days180Pos.isActive) {
    total = total.plus(days180Pos.amount);
  }

  return total;
}

/**
 * Update protocol activeStakers count
 * Call this when user's activePositionsCount changes from 0 to >0 or vice versa
 */
export function updateProtocolActiveStakers(
  previousActiveCount: i32,
  newActiveCount: i32,
  protocol: Protocol,
): void {
  // User just became active (0 -> 1+)
  if (previousActiveCount == 0 && newActiveCount > 0) {
    protocol.activeStakers = protocol.activeStakers + 1;
  }
  // User just became inactive (1+ -> 0)
  else if (previousActiveCount > 0 && newActiveCount == 0) {
    protocol.activeStakers = protocol.activeStakers - 1;
  }
  // Otherwise, activeStakers count doesn't change
}

// ============================================
// SNAPSHOTS
// ============================================

/**
 * Get or create hourly snapshot
 * ID is hour timestamp (block.timestamp / 3600)
 */
export function getOrCreateHourlySnapshot(
  block: ethereum.Block,
): HourlySnapshot {
  let hourId = block.timestamp.toI32() / 3600;
  let id = hourId.toString();
  let snapshot = HourlySnapshot.load(id);

  if (snapshot == null) {
    snapshot = new HourlySnapshot(id);
    let protocol = getOrCreateProtocol();

    snapshot.timestamp = block.timestamp;
    snapshot.periodStartTimestamp = BigInt.fromI32(hourId * 3600);

    // Point-in-time values
    snapshot.totalSupply = protocol.totalSupply;
    snapshot.totalStaked = protocol.totalStaked;
    snapshot.totalVested = protocol.totalVestingAllocated;
    snapshot.treasuryBalance = protocol.treasuryBalance;
    snapshot.totalValueLocked = protocol.totalValueLocked;
    snapshot.activePositionsCount = protocol.totalActivePositions;
    snapshot.uniqueStakers = protocol.uniqueStakers;
    snapshot.activeStakers = protocol.activeStakers; 
    snapshot.totalUsers = protocol.totalUsers;

    // Hourly deltas (initialized to 0)
    snapshot.stakeVolume = ZERO_BI;
    snapshot.unstakeVolume = ZERO_BI;
    snapshot.rewardsClaimed = ZERO_BI;
    snapshot.compounded = ZERO_BI;
    snapshot.vestingClaimed = ZERO_BI;
    snapshot.transferVolume = ZERO_BI;
    snapshot.treasuryFeesCollected = ZERO_BI;
    snapshot.burnedAmount = ZERO_BI;
    snapshot.mintedAmount = ZERO_BI;

    // User activity
    snapshot.newUsers = 0;
    snapshot.newStakers = 0;
    snapshot.newPositionsCreated = 0;
    snapshot.positionsUnstaked = 0;

    // APR
    snapshot.currentAPR = protocol.currentAPR;

    snapshot.save();
  }

  return snapshot;
}

/**
 * Get or create daily snapshot
 * ID is date (YYYYMMDD format)
 */
export function getOrCreateDailySnapshot(block: ethereum.Block): DailySnapshot {
  let day = block.timestamp.toI32() / 86400;
  let date = day * 86400;

  // Format: YYYYMMDD
  let timestamp = BigInt.fromI32(date);
  let dateObj = new Date(timestamp.toI64() * 1000);
  let year = dateObj.getUTCFullYear();
  let month = dateObj.getUTCMonth() + 1;
  let dayOfMonth = dateObj.getUTCDate();

  let dateInt = year * 10000 + month * 100 + dayOfMonth;
  let id = dateInt.toString();

  let snapshot = DailySnapshot.load(id);

  if (snapshot == null) {
    snapshot = new DailySnapshot(id);
    let protocol = getOrCreateProtocol();

    snapshot.date = dateInt;
    snapshot.timestamp = block.timestamp;

    // Point-in-time values
    snapshot.totalSupply = protocol.totalSupply;
    snapshot.totalStaked = protocol.totalStaked;
    snapshot.totalVested = protocol.totalVestingAllocated;
    snapshot.treasuryBalance = protocol.treasuryBalance;
    snapshot.totalValueLocked = protocol.totalValueLocked;
    snapshot.activePositionsCount = protocol.totalActivePositions;
    snapshot.uniqueStakers = protocol.uniqueStakers;
    snapshot.activeStakers = protocol.activeStakers; 
    snapshot.totalUsers = protocol.totalUsers;

    // Daily deltas
    snapshot.stakeVolume = ZERO_BI;
    snapshot.unstakeVolume = ZERO_BI;
    snapshot.netStakeFlow = ZERO_BI;
    snapshot.rewardsClaimed = ZERO_BI;
    snapshot.compounded = ZERO_BI;
    snapshot.vestingClaimed = ZERO_BI;
    snapshot.transferVolume = ZERO_BI;
    snapshot.treasuryFeesCollected = ZERO_BI;
    snapshot.burnedAmount = ZERO_BI;
    snapshot.mintedAmount = ZERO_BI;

    // User activity
    snapshot.newUsers = 0;
    snapshot.newStakers = 0;
    snapshot.newPositionsCreated = 0;
    snapshot.positionsUnstaked = 0;

    // Statistics
    snapshot.avgAPR = protocol.currentAPR;
    snapshot.highTVL = protocol.totalValueLocked;
    snapshot.lowTVL = protocol.totalValueLocked;

    snapshot.save();
  }

  return snapshot;
}

// ============================================
// PROTOCOL STATE UPDATES
// ============================================

/**
 * Update protocol state (TVL, timestamps, etc.)
 * Call this at the end of every handler
 */
export function updateProtocolState(block: ethereum.Block): void {
  let protocol = getOrCreateProtocol();

  // Update TVL
  protocol.totalValueLocked = protocol.totalStaked.plus(
    protocol.totalVestingAllocated,
  );

  // Update timestamps
  protocol.lastUpdateTimestamp = block.timestamp;
  protocol.lastUpdateBlock = block.number;

  protocol.save();
}

/**
 * Sync snapshots with current protocol state
 * Call this at the end of handlers that modify protocol stats
 */
export function syncSnapshots(block: ethereum.Block): void {
  let protocol = getOrCreateProtocol();

  // Update hourly snapshot
  let hourlySnapshot = getOrCreateHourlySnapshot(block);
  hourlySnapshot.totalSupply = protocol.totalSupply;
  hourlySnapshot.totalStaked = protocol.totalStaked;
  hourlySnapshot.totalVested = protocol.totalVestingAllocated;
  hourlySnapshot.treasuryBalance = protocol.treasuryBalance;
  hourlySnapshot.totalValueLocked = protocol.totalValueLocked;
  hourlySnapshot.activePositionsCount = protocol.totalActivePositions;
  hourlySnapshot.uniqueStakers = protocol.uniqueStakers;
  hourlySnapshot.activeStakers = protocol.activeStakers; 
  hourlySnapshot.totalUsers = protocol.totalUsers;
  hourlySnapshot.currentAPR = protocol.currentAPR;
  hourlySnapshot.save();

  // Update daily snapshot
  let dailySnapshot = getOrCreateDailySnapshot(block);
  dailySnapshot.totalSupply = protocol.totalSupply;
  dailySnapshot.totalStaked = protocol.totalStaked;
  dailySnapshot.totalVested = protocol.totalVestingAllocated;
  dailySnapshot.treasuryBalance = protocol.treasuryBalance;
  dailySnapshot.totalValueLocked = protocol.totalValueLocked;
  dailySnapshot.activePositionsCount = protocol.totalActivePositions;
  dailySnapshot.uniqueStakers = protocol.uniqueStakers;
  dailySnapshot.activeStakers = protocol.activeStakers; 
  dailySnapshot.totalUsers = protocol.totalUsers;
  dailySnapshot.avgAPR = protocol.currentAPR;

  // Update high/low TVL
  if (protocol.totalValueLocked.gt(dailySnapshot.highTVL)) {
    dailySnapshot.highTVL = protocol.totalValueLocked;
  }
  if (protocol.totalValueLocked.lt(dailySnapshot.lowTVL)) {
    dailySnapshot.lowTVL = protocol.totalValueLocked;
  }

  dailySnapshot.save();
}
