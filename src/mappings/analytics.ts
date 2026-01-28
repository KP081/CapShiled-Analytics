import {
  Transfer,
  RoleGranted,
  RoleRevoked,
  RevenueMint,
  TreasuryFee,
  Mint,
  Burn,
  TreasuryAddressUpdated,
  DaoAddressUpdated,
  ExemptionUpdated,
} from "../../generated/CAPX/CAPX";

import {
  VestingCreated,
  TokensClaimed,
  VestingRevoked,
} from "../../generated/CAPXVesting/CAPXVesting";

import {
  Staked,
  Unstaked,
  RewardClaimed,
  RewardsDeposited,
  Compounded,
  BaseAprUpdated,
  MinStakeAmountUpdated,
  LockMultiplierUpdated,
  TokenRecovered,
} from "../../generated/CAPXStaking/CAPXStaking";

import {
  Protocol,
  User,
  VestingPosition,
  StakingPosition,
  RoleAccount,
  WeeklyData,
  MonthlyData,
  YearlyData,
  Transaction,
  LockStat,
} from "../../generated/schema";

import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";

/* ======================================================
   CONSTANTS
====================================================== */

const PROTOCOL_ID = "CAPX";
const ZERO = BigInt.zero();
const ONE = BigInt.fromI32(1);

/* ======================================================
   HELPERS
====================================================== */

function weekId(ts: BigInt): string {
  return (ts.toI64() / 604800).toString();
}

function monthId(ts: BigInt): string {
  return (ts.toI64() / 2592000).toString();
}

function yearId(ts: BigInt): string {
  return (ts.toI64() / 31536000).toString();
}

function decodeRoles(roleBitmap: BigInt): string[] {
  let roles = new Array<string>();

  if (roleBitmap.bitAnd(BigInt.fromI32(1)).notEqual(ZERO)) {
    roles.push("TEAM");
  }
  if (roleBitmap.bitAnd(BigInt.fromI32(2)).notEqual(ZERO)) {
    roles.push("TREASURY");
  }
  if (roleBitmap.bitAnd(BigInt.fromI32(4)).notEqual(ZERO)) {
    roles.push("DAO");
  }

  return roles;
}

/* ======================================================
   PROTOCOL
====================================================== */

function getProtocol(event: ethereum.Event): Protocol {
  let p = Protocol.load(PROTOCOL_ID);

  if (p == null) {
    p = new Protocol(PROTOCOL_ID);

    p.totalUsers = ZERO;
    p.totalActiveStakers = ZERO;
    p.totalTransactions = ZERO;

    p.totalStakedRaw = ZERO;
    p.totalVestedRaw = ZERO;
    p.totalTVLRaw = ZERO;

    p.totalRewardsDistributedRaw = ZERO;
    p.totalVestingClaimedRaw = ZERO;

    p.circulatingSupplyRaw = ZERO;
    p.totalBurnedRaw = ZERO;
    p.totalTreasuryFeeRaw = ZERO;

    p.totalTeamMintedRaw = ZERO;
    p.totalTreasuryMintedRaw = ZERO;
    p.totalDAOmintedRaw = ZERO;

    p.lastUpdateBlock = event.block.number;
    p.lastUpdateTimestamp = event.block.timestamp;

    p.save();
  }

  return p;
}

function updateTVL(p: Protocol): void {
  p.totalTVLRaw = p.totalStakedRaw.plus(p.totalVestedRaw);
}

/* ======================================================
   USERS
====================================================== */

function getOrCreateUser(addr: Address, event: ethereum.Event): User {
  let id = addr.toHexString();
  let u = User.load(id);

  if (u == null) {
    u = new User(id);
    u.address = addr;

    u.firstSeenBlock = event.block.number;
    u.firstSeenTimestamp = event.block.timestamp;

    u.txCount = ZERO;
    u.lastActivityTimestamp = event.block.timestamp;

    u.hasActiveStake = false;
    u.hasActiveVesting = false;

    u.totalStakedRaw = ZERO;
    u.totalUnstakedRaw = ZERO;
    u.totalRewardsClaimedRaw = ZERO;

    u.totalVestingAllocatedRaw = ZERO;
    u.totalVestingClaimedRaw = ZERO;

    u.save();

    let p = getProtocol(event);
    p.totalUsers = p.totalUsers.plus(ONE);
    p.lastUpdateBlock = event.block.number;
    p.lastUpdateTimestamp = event.block.timestamp;
    p.save();

    let w = getOrCreateWeeklyData(
      weekId(event.block.timestamp),
      event.block.timestamp,
    );
    let m = getOrCreateMonthlyData(
      monthId(event.block.timestamp),
      event.block.timestamp,
    );
    let y = getOrCreateYearlyData(
      yearId(event.block.timestamp),
      event.block.timestamp,
    );

    w.newUsers = w.newUsers.plus(ONE);
    m.newUsers = m.newUsers.plus(ONE);
    y.newUsers = y.newUsers.plus(ONE);

    syncTimeSeriesSnapshots(event, w, m, y);
  }

  return u;
}

/* ======================================================
   LOCK STATS
====================================================== */

function getOrCreateLockStat(lockOption: i32): LockStat {
  let id = "lock-" + lockOption.toString();
  let l = LockStat.load(id);

  if (l == null) {
    l = new LockStat(id);
    l.lockOption = lockOption;
    l.totalLockedRaw = ZERO;
    l.activePositions = ZERO;
    l.totalRewardsDistributedRaw = ZERO;
    l.save();
  }

  return l;
}

/* ======================================================
   TIME SERIES HELPERS
====================================================== */

function getOrCreateWeeklyData(id: string, ts: BigInt): WeeklyData {
  let w = WeeklyData.load(id);
  if (w == null) {
    w = new WeeklyData(id);
    w.timestamp = ts;
    w.totalTransactions = ZERO;
    w.transferCount = ZERO;
    w.transferVolumeRaw = ZERO;
    w.stakingVolumeRaw = ZERO;
    w.unstakingVolumeRaw = ZERO;
    w.netStakingFlowRaw = ZERO;
    w.rewardsDistributedRaw = ZERO;
    w.newUsers = ZERO;
    w.cumulativeUsers = ZERO;
    w.activeStakersCount = ZERO;

    let p = Protocol.load(PROTOCOL_ID);
    if (p != null) {
      w.tvlStartRaw = p.totalTVLRaw;
    } else {
      w.tvlStartRaw = ZERO;
    }

    w.tvlEndRaw = ZERO;
    w.tvlPeakRaw = ZERO;
  }
  return w;
}

function getOrCreateMonthlyData(id: string, ts: BigInt): MonthlyData {
  let m = MonthlyData.load(id);
  if (m == null) {
    m = new MonthlyData(id);
    m.timestamp = ts;
    m.totalTransactions = ZERO;
    m.transferCount = ZERO;
    m.transferVolumeRaw = ZERO;
    m.stakingVolumeRaw = ZERO;
    m.unstakingVolumeRaw = ZERO;
    m.netStakingFlowRaw = ZERO;
    m.rewardsDistributedRaw = ZERO;
    m.newUsers = ZERO;
    m.cumulativeUsers = ZERO;
    m.activeStakersCount = ZERO;

    let p = Protocol.load(PROTOCOL_ID);
    if (p != null) {
      m.tvlStartRaw = p.totalTVLRaw;
    } else {
      m.tvlStartRaw = ZERO;
    }

    m.tvlEndRaw = ZERO;
    m.tvlPeakRaw = ZERO;
  }
  return m;
}

function getOrCreateYearlyData(id: string, ts: BigInt): YearlyData {
  let y = YearlyData.load(id);
  if (y == null) {
    y = new YearlyData(id);
    y.timestamp = ts;
    y.totalTransactions = ZERO;
    y.transferCount = ZERO;
    y.transferVolumeRaw = ZERO;
    y.stakingVolumeRaw = ZERO;
    y.unstakingVolumeRaw = ZERO;
    y.netStakingFlowRaw = ZERO;
    y.rewardsDistributedRaw = ZERO;
    y.newUsers = ZERO;
    y.cumulativeUsers = ZERO;
    y.activeStakersCount = ZERO;

    let p = Protocol.load(PROTOCOL_ID);
    if (p != null) {
      y.tvlStartRaw = p.totalTVLRaw;
    } else {
      y.tvlStartRaw = ZERO;
    }

    y.tvlEndRaw = ZERO;
    y.tvlPeakRaw = ZERO;
  }
  return y;
}

/* ======================================================
   TIME SERIES SYNC
====================================================== */

function syncTimeSeriesSnapshots(
  event: ethereum.Event,
  w: WeeklyData,
  m: MonthlyData,
  y: YearlyData,
): void {
  let p = getProtocol(event);

  w.cumulativeUsers = p.totalUsers;
  m.cumulativeUsers = p.totalUsers;
  y.cumulativeUsers = p.totalUsers;

  w.activeStakersCount = p.totalActiveStakers;
  m.activeStakersCount = p.totalActiveStakers;
  y.activeStakersCount = p.totalActiveStakers;

  w.tvlEndRaw = p.totalTVLRaw;
  m.tvlEndRaw = p.totalTVLRaw;
  y.tvlEndRaw = p.totalTVLRaw;

  if (p.totalTVLRaw.gt(w.tvlPeakRaw)) w.tvlPeakRaw = p.totalTVLRaw;
  if (p.totalTVLRaw.gt(m.tvlPeakRaw)) m.tvlPeakRaw = p.totalTVLRaw;
  if (p.totalTVLRaw.gt(y.tvlPeakRaw)) y.tvlPeakRaw = p.totalTVLRaw;

  w.save();
  m.save();
  y.save();
}

/* ======================================================
   TRANSACTION TRACKING
====================================================== */

function trackTx(event: ethereum.Event): void {
  let txId = event.transaction.hash.toHex();
  if (Transaction.load(txId) == null) {
    let tx = new Transaction(txId);
    tx.blockNumber = event.block.number;
    tx.timestamp = event.block.timestamp;
    tx.save();

    let p = getProtocol(event);
    p.totalTransactions = p.totalTransactions.plus(ONE);
    p.lastUpdateBlock = event.block.number;
    p.lastUpdateTimestamp = event.block.timestamp;
    p.save();

    let w = getOrCreateWeeklyData(
      weekId(event.block.timestamp),
      event.block.timestamp,
    );
    let m = getOrCreateMonthlyData(
      monthId(event.block.timestamp),
      event.block.timestamp,
    );
    let y = getOrCreateYearlyData(
      yearId(event.block.timestamp),
      event.block.timestamp,
    );

    w.totalTransactions = w.totalTransactions.plus(ONE);
    m.totalTransactions = m.totalTransactions.plus(ONE);
    y.totalTransactions = y.totalTransactions.plus(ONE);

    syncTimeSeriesSnapshots(event, w, m, y);
  }
}

/* ======================================================
   UPDATE USER ACTIVITY
====================================================== */

function updateUserActivity(user: User, event: ethereum.Event): void {
  user.txCount = user.txCount.plus(ONE);
  user.lastActivityTimestamp = event.block.timestamp;
  user.save();
}

/* ======================================================
   ROLES
====================================================== */

export function handleRoleGranted(event: RoleGranted): void {
  let roles = decodeRoles(event.params.role);

  for (let i = 0; i < roles.length; i++) {
    let roleName = roles[i];
    let id = roleName + "-" + event.params.account.toHexString();

    let r = RoleAccount.load(id);
    if (r == null) {
      r = new RoleAccount(id);
      r.role = roleName;
      r.account = event.params.account;
    }

    r.isActive = true;
    r.assignedAtBlock = event.block.number;
    r.assignedAtTimestamp = event.block.timestamp;
    r.revokedAtBlock = null;
    r.revokedAtTimestamp = null;
    r.save();
  }
}

export function handleRoleRevoked(event: RoleRevoked): void {
  let roles = decodeRoles(event.params.role);

  for (let i = 0; i < roles.length; i++) {
    let roleName = roles[i];
    let id = roleName + "-" + event.params.account.toHexString();

    let r = RoleAccount.load(id);
    if (r != null) {
      r.isActive = false;
      r.revokedAtBlock = event.block.number;
      r.revokedAtTimestamp = event.block.timestamp;
      r.save();
    }
  }
}

/* ======================================================
   TRANSFER
====================================================== */

export function handleTransfer(event: Transfer): void {
  trackTx(event);

  if (event.params.from != Address.zero()) {
    let from = getOrCreateUser(event.params.from, event);
    updateUserActivity(from, event);
  }

  if (event.params.to != Address.zero()) {
    let to = getOrCreateUser(event.params.to, event);
    updateUserActivity(to, event);
  }

  let w = getOrCreateWeeklyData(
    weekId(event.block.timestamp),
    event.block.timestamp,
  );
  let m = getOrCreateMonthlyData(
    monthId(event.block.timestamp),
    event.block.timestamp,
  );
  let y = getOrCreateYearlyData(
    yearId(event.block.timestamp),
    event.block.timestamp,
  );

  w.transferCount = w.transferCount.plus(ONE);
  w.transferVolumeRaw = w.transferVolumeRaw.plus(event.params.amount);

  m.transferCount = m.transferCount.plus(ONE);
  m.transferVolumeRaw = m.transferVolumeRaw.plus(event.params.amount);

  y.transferCount = y.transferCount.plus(ONE);
  y.transferVolumeRaw = y.transferVolumeRaw.plus(event.params.amount);

  syncTimeSeriesSnapshots(event, w, m, y);
}

/* ======================================================
   MINT / BURN / TREASURY FEE / REVENUE MINT
====================================================== */

export function handleMint(event: Mint): void {
  trackTx(event);

  let p = getProtocol(event);

  p.circulatingSupplyRaw = p.circulatingSupplyRaw.plus(event.params.amount);

  // Mint event has role parameter to track which role is minting
  if (event.params.role.equals(BigInt.fromI32(1))) {
    p.totalTeamMintedRaw = p.totalTeamMintedRaw.plus(event.params.amount);
  } else if (event.params.role.equals(BigInt.fromI32(2))) {
    p.totalTreasuryMintedRaw = p.totalTreasuryMintedRaw.plus(
      event.params.amount,
    );
  } else if (event.params.role.equals(BigInt.fromI32(4))) {
    p.totalDAOmintedRaw = p.totalDAOmintedRaw.plus(event.params.amount);
  }

  p.lastUpdateBlock = event.block.number;
  p.lastUpdateTimestamp = event.block.timestamp;
  p.save();
}

export function handleRevenueMint(event: RevenueMint): void {
  trackTx(event);

  let p = getProtocol(event);
  
  let tokensMinted = event.params.tokensMinted;

  // Update circulating supply
  p.circulatingSupplyRaw = p.circulatingSupplyRaw.plus(tokensMinted);

  p.lastUpdateBlock = event.block.number;
  p.lastUpdateTimestamp = event.block.timestamp;
  p.save();
}

export function handleBurn(event: Burn): void {
  trackTx(event);

  let p = getProtocol(event);

  p.totalBurnedRaw = p.totalBurnedRaw.plus(event.params.amount);
  p.circulatingSupplyRaw = p.circulatingSupplyRaw.minus(event.params.amount);

  if (p.circulatingSupplyRaw.lt(ZERO)) {
    p.circulatingSupplyRaw = ZERO;
  }

  p.lastUpdateBlock = event.block.number;
  p.lastUpdateTimestamp = event.block.timestamp;
  p.save();
}

export function handleTreasuryFee(event: TreasuryFee): void {
  trackTx(event);

  let p = getProtocol(event);
  p.totalTreasuryFeeRaw = p.totalTreasuryFeeRaw.plus(event.params.amount);
  p.lastUpdateBlock = event.block.number;
  p.lastUpdateTimestamp = event.block.timestamp;
  p.save();
}

/* ======================================================
   VESTING
====================================================== */

export function handleVestingCreated(event: VestingCreated): void {
  trackTx(event);

  let p = getProtocol(event);
  let user = getOrCreateUser(event.params.beneficiary, event);

  let vestingId =
    event.transaction.hash.toHex() + "-" + event.logIndex.toString();

  let v = new VestingPosition(vestingId);

  v.user = user.id;
  v.beneficiary = event.params.beneficiary;
  v.totalAllocatedRaw = event.params.totalAllocation;
  v.totalClaimedRaw = ZERO;
  v.startTime = event.params.startTime;
  v.cliffEnd = null;
  v.endTime = event.params.vestingEnd;
  v.revoked = false;
  v.active = true;
  v.createdAt = event.block.timestamp;
  v.createdAtBlock = event.block.number;
  v.revokedAt = null;
  v.save();

  p.totalVestedRaw = p.totalVestedRaw.plus(event.params.totalAllocation);
  updateTVL(p);
  p.lastUpdateBlock = event.block.number;
  p.lastUpdateTimestamp = event.block.timestamp;
  p.save();

  user.hasActiveVesting = true;
  user.totalVestingAllocatedRaw = user.totalVestingAllocatedRaw.plus(
    event.params.totalAllocation,
  );
  updateUserActivity(user, event);

  let w = getOrCreateWeeklyData(
    weekId(event.block.timestamp),
    event.block.timestamp,
  );
  let m = getOrCreateMonthlyData(
    monthId(event.block.timestamp),
    event.block.timestamp,
  );
  let y = getOrCreateYearlyData(
    yearId(event.block.timestamp),
    event.block.timestamp,
  );

  syncTimeSeriesSnapshots(event, w, m, y);
}

export function handleTokensClaimed(event: TokensClaimed): void {
  trackTx(event);

  let p = getProtocol(event);
  let user = getOrCreateUser(event.params.beneficiary, event);

  let claimed = event.params.amount;

  p.totalVestingClaimedRaw = p.totalVestingClaimedRaw.plus(claimed);
  p.totalVestedRaw = p.totalVestedRaw.minus(claimed);

  if (p.totalVestedRaw.lt(ZERO)) {
    p.totalVestedRaw = ZERO;
  }

  updateTVL(p);
  p.lastUpdateBlock = event.block.number;
  p.lastUpdateTimestamp = event.block.timestamp;
  p.save();

  user.totalVestingClaimedRaw = user.totalVestingClaimedRaw.plus(claimed);
  updateUserActivity(user, event);

  let w = getOrCreateWeeklyData(
    weekId(event.block.timestamp),
    event.block.timestamp,
  );
  let m = getOrCreateMonthlyData(
    monthId(event.block.timestamp),
    event.block.timestamp,
  );
  let y = getOrCreateYearlyData(
    yearId(event.block.timestamp),
    event.block.timestamp,
  );

  syncTimeSeriesSnapshots(event, w, m, y);
}

export function handleVestingRevoked(event: VestingRevoked): void {
  trackTx(event);

  let user = getOrCreateUser(event.params.beneficiary, event);
  let positions = user.vestingPositions.load();

  for (let i = 0; i < positions.length; i++) {
    if (positions[i].active) {
      let v = positions[i];
      v.revoked = true;
      v.active = false;
      v.revokedAt = event.block.timestamp;
      v.save();

      let p = getProtocol(event);
      let remaining = v.totalAllocatedRaw.minus(v.totalClaimedRaw);

      p.totalVestedRaw = p.totalVestedRaw.minus(remaining);

      if (p.totalVestedRaw.lt(ZERO)) {
        p.totalVestedRaw = ZERO;
      }

      updateTVL(p);
      p.lastUpdateBlock = event.block.number;
      p.lastUpdateTimestamp = event.block.timestamp;
      p.save();

      let w = getOrCreateWeeklyData(
        weekId(event.block.timestamp),
        event.block.timestamp,
      );
      let m = getOrCreateMonthlyData(
        monthId(event.block.timestamp),
        event.block.timestamp,
      );
      let y = getOrCreateYearlyData(
        yearId(event.block.timestamp),
        event.block.timestamp,
      );

      syncTimeSeriesSnapshots(event, w, m, y);

      break;
    }
  }

  user.hasActiveVesting = false;
  updateUserActivity(user, event);
}

/* ======================================================
   STAKING
====================================================== */

export function handleStaked(event: Staked): void {
  trackTx(event);

  let u = getOrCreateUser(event.params.user, event);
  let l = getOrCreateLockStat(event.params.lockOption);
  let p = getProtocol(event);

  let wasActive = u.hasActiveStake;

  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let s = new StakingPosition(id);

  s.user = u.id;
  s.userAddress = event.params.user;
  s.amountRaw = event.params.amount;
  s.lockOption = event.params.lockOption;
  s.unlockTime = event.params.unlockTime;
  s.active = true;
  s.totalRewardsClaimedRaw = ZERO;
  s.stakedAt = event.block.timestamp;
  s.stakedAtBlock = event.block.number;
  s.unstakedAt = null;
  s.save();

  if (!wasActive) {
    p.totalActiveStakers = p.totalActiveStakers.plus(ONE);
  }

  p.totalStakedRaw = p.totalStakedRaw.plus(event.params.amount);
  updateTVL(p);
  p.lastUpdateBlock = event.block.number;
  p.lastUpdateTimestamp = event.block.timestamp;
  p.save();

  l.totalLockedRaw = l.totalLockedRaw.plus(event.params.amount);
  l.activePositions = l.activePositions.plus(ONE);
  l.save();

  u.hasActiveStake = true;
  u.totalStakedRaw = u.totalStakedRaw.plus(event.params.amount);
  updateUserActivity(u, event);

  let w = getOrCreateWeeklyData(
    weekId(event.block.timestamp),
    event.block.timestamp,
  );
  let m = getOrCreateMonthlyData(
    monthId(event.block.timestamp),
    event.block.timestamp,
  );
  let y = getOrCreateYearlyData(
    yearId(event.block.timestamp),
    event.block.timestamp,
  );

  w.stakingVolumeRaw = w.stakingVolumeRaw.plus(event.params.amount);
  w.netStakingFlowRaw = w.netStakingFlowRaw.plus(event.params.amount);

  m.stakingVolumeRaw = m.stakingVolumeRaw.plus(event.params.amount);
  m.netStakingFlowRaw = m.netStakingFlowRaw.plus(event.params.amount);

  y.stakingVolumeRaw = y.stakingVolumeRaw.plus(event.params.amount);
  y.netStakingFlowRaw = y.netStakingFlowRaw.plus(event.params.amount);

  syncTimeSeriesSnapshots(event, w, m, y);
}

export function handleUnstaked(event: Unstaked): void {
  trackTx(event);

  let u = getOrCreateUser(event.params.user, event);
  let p = getProtocol(event);

  let wasActive = u.hasActiveStake;

  let positions = u.stakingPositions.load();
  for (let i = 0; i < positions.length; i++) {
    if (positions[i].active) {
      let pos = positions[i];
      pos.active = false;
      pos.unstakedAt = event.block.timestamp;
      pos.save();
    }
  }

  let remainingStake = u.totalStakedRaw.minus(event.params.amount);
  if (remainingStake.lt(ZERO)) {
    remainingStake = ZERO;
  }

  p.totalStakedRaw = p.totalStakedRaw.minus(event.params.amount);

  if (p.totalStakedRaw.lt(ZERO)) {
    p.totalStakedRaw = ZERO;
  }

  updateTVL(p);

  if (remainingStake.equals(ZERO) && wasActive) {
    if (p.totalActiveStakers.gt(ZERO)) {
      p.totalActiveStakers = p.totalActiveStakers.minus(ONE);
    }
  }

  p.lastUpdateBlock = event.block.number;
  p.lastUpdateTimestamp = event.block.timestamp;
  p.save();

  u.totalStakedRaw = remainingStake;
  u.totalUnstakedRaw = u.totalUnstakedRaw.plus(event.params.amount);
  u.hasActiveStake = remainingStake.gt(ZERO);
  updateUserActivity(u, event);

  let w = getOrCreateWeeklyData(
    weekId(event.block.timestamp),
    event.block.timestamp,
  );
  let m = getOrCreateMonthlyData(
    monthId(event.block.timestamp),
    event.block.timestamp,
  );
  let y = getOrCreateYearlyData(
    yearId(event.block.timestamp),
    event.block.timestamp,
  );

  w.unstakingVolumeRaw = w.unstakingVolumeRaw.plus(event.params.amount);
  w.netStakingFlowRaw = w.netStakingFlowRaw.minus(event.params.amount);

  m.unstakingVolumeRaw = m.unstakingVolumeRaw.plus(event.params.amount);
  m.netStakingFlowRaw = m.netStakingFlowRaw.minus(event.params.amount);

  y.unstakingVolumeRaw = y.unstakingVolumeRaw.plus(event.params.amount);
  y.netStakingFlowRaw = y.netStakingFlowRaw.minus(event.params.amount);

  syncTimeSeriesSnapshots(event, w, m, y);
}

/* ======================================================
   REWARDS
====================================================== */

export function handleRewardClaimed(event: RewardClaimed): void {
  trackTx(event);

  let p = getProtocol(event);
  p.totalRewardsDistributedRaw = p.totalRewardsDistributedRaw.plus(
    event.params.reward,
  );
  p.lastUpdateBlock = event.block.number;
  p.lastUpdateTimestamp = event.block.timestamp;
  p.save();

  let u = getOrCreateUser(event.params.user, event);
  u.totalRewardsClaimedRaw = u.totalRewardsClaimedRaw.plus(event.params.reward);
  updateUserActivity(u, event);

  let w = getOrCreateWeeklyData(
    weekId(event.block.timestamp),
    event.block.timestamp,
  );
  let m = getOrCreateMonthlyData(
    monthId(event.block.timestamp),
    event.block.timestamp,
  );
  let y = getOrCreateYearlyData(
    yearId(event.block.timestamp),
    event.block.timestamp,
  );

  w.rewardsDistributedRaw = w.rewardsDistributedRaw.plus(event.params.reward);
  m.rewardsDistributedRaw = m.rewardsDistributedRaw.plus(event.params.reward);
  y.rewardsDistributedRaw = y.rewardsDistributedRaw.plus(event.params.reward);

  syncTimeSeriesSnapshots(event, w, m, y);
}

export function handleCompounded(event: Compounded): void {
  trackTx(event);

  let p = getProtocol(event);
  p.totalStakedRaw = p.totalStakedRaw.plus(event.params.rewardAdded);
  updateTVL(p);
  p.lastUpdateBlock = event.block.number;
  p.lastUpdateTimestamp = event.block.timestamp;
  p.save();

  let w = getOrCreateWeeklyData(
    weekId(event.block.timestamp),
    event.block.timestamp,
  );
  let m = getOrCreateMonthlyData(
    monthId(event.block.timestamp),
    event.block.timestamp,
  );
  let y = getOrCreateYearlyData(
    yearId(event.block.timestamp),
    event.block.timestamp,
  );

  w.stakingVolumeRaw = w.stakingVolumeRaw.plus(event.params.rewardAdded);
  w.netStakingFlowRaw = w.netStakingFlowRaw.plus(event.params.rewardAdded);

  m.stakingVolumeRaw = m.stakingVolumeRaw.plus(event.params.rewardAdded);
  m.netStakingFlowRaw = m.netStakingFlowRaw.plus(event.params.rewardAdded);

  y.stakingVolumeRaw = y.stakingVolumeRaw.plus(event.params.rewardAdded);
  y.netStakingFlowRaw = y.netStakingFlowRaw.plus(event.params.rewardAdded);

  syncTimeSeriesSnapshots(event, w, m, y);
}

/* ======================================================
   OTHER EVENTS
====================================================== */

export function handleTreasuryAddressUpdated(
  event: TreasuryAddressUpdated,
): void {
  trackTx(event);
}

export function handleDaoAddressUpdated(event: DaoAddressUpdated): void {
  trackTx(event);
}

export function handleExemptionUpdated(event: ExemptionUpdated): void {
  trackTx(event);
}

export function handleRewardsDeposited(event: RewardsDeposited): void {
  trackTx(event);
}

export function handleTokenRecovered(event: TokenRecovered): void {
  trackTx(event);
}

export function handleLockMultiplierUpdated(
  event: LockMultiplierUpdated,
): void {
  trackTx(event);
}

export function handleMinStakeAmountUpdated(
  event: MinStakeAmountUpdated,
): void {
  trackTx(event);
}

export function handleBaseAprUpdated(event: BaseAprUpdated): void {
  trackTx(event);
}