import {
  Transfer,
  RoleGranted,
  RoleRevoked,
  RevenueMint,
  TreasuryFee,
  Mint,
  Burn,
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

import { Address, BigInt, BigDecimal, ethereum } from "@graphprotocol/graph-ts";

/* ======================================================
   CONSTANTS
====================================================== */

const PROTOCOL_ID = "CAPX";
const ZERO = BigInt.zero();
const ONE = BigInt.fromI32(1);
const DECIMALS = BigInt.fromI32(10).pow(18);

/* ======================================================
   TIME HELPERS
====================================================== */

function updateTVL(p: Protocol): void {
  p.totalTVLRaw = p.totalStakedRaw.plus(p.totalVestedRaw);
  p.totalTVL = toDecimal(p.totalTVLRaw);
}

function weekId(ts: BigInt): string {
  return (ts.toI64() / 604800).toString();
}

function monthId(ts: BigInt): string {
  return (ts.toI64() / 2592000).toString();
}

function yearId(ts: BigInt): string {
  return (ts.toI64() / 31536000).toString();
}

function toDecimal(value: BigInt): BigDecimal {
  return value.toBigDecimal().div(DECIMALS.toBigDecimal());
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

function getOrCreateLockStat(lockOption: i32): LockStat {
  let id = "lock-" + lockOption.toString();
  let l = LockStat.load(id);

  if (l == null) {
    l = new LockStat(id);
    l.lockOption = lockOption;
    l.totalLockedRaw = ZERO;
    l.totalLocked = BigDecimal.zero();
    l.activePositions = ZERO;
    l.totalRewardsDistributedRaw = ZERO;
    l.totalRewardsDistributed = BigDecimal.zero();
    l.save();
  }

  return l;
}

/* ======================================================
   PROTOCOL
====================================================== */

function getProtocol(block: BigInt, ts: BigInt): Protocol {
  let p = Protocol.load("CAPX");

  if (p == null) {
    p = new Protocol("CAPX");

    p.totalUsers = ZERO;
    p.totalTransactions = ZERO;

    p.totalStakedRaw = ZERO;
    p.totalStaked = BigDecimal.zero();

    p.totalVestedRaw = ZERO;
    p.totalVested = BigDecimal.zero();

    p.totalTVLRaw = ZERO;
    p.totalTVL = BigDecimal.zero();

    p.totalRewardsDistributedRaw = ZERO;
    p.totalRewardsDistributed = BigDecimal.zero();

    p.totalVestingAllocatedRaw = ZERO;
    p.totalVestingAllocated = BigDecimal.zero();

    p.totalVestingClaimedRaw = ZERO;
    p.totalVestingClaimed = BigDecimal.zero();

    p.circulatingSupplyRaw = ZERO;
    p.circulatingSupply = BigDecimal.zero();

    p.totalBurnedRaw = ZERO;
    p.totalBurned = BigDecimal.zero();

    p.totalTreasuryFeeRaw = ZERO;
    p.totalTreasuryFee = BigDecimal.zero();

    p.totalTeamMintedRaw = ZERO;
    p.totalTeamMinted = BigDecimal.zero();

    p.totalTreasuryMintedRaw = ZERO;
    p.totalTreasuryMinted = BigDecimal.zero();

    p.totalDAOmintedRaw = ZERO;
    p.totalDAOminted = BigDecimal.zero();

    p.lastUpdateBlock = block;
    p.lastUpdateTimestamp = ts;
    p.save();
  }

  return p;
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
    u.totalRewardsClaimed = BigDecimal.zero();

    u.totalVestingAllocatedRaw = ZERO;
    u.totalVestingClaimedRaw = ZERO;

    u.save();

    let p = getProtocol(event.block.number, event.block.timestamp);
    p.totalUsers = p.totalUsers.plus(ONE);
    p.save();
  }

  return u;
}

/* ======================================================
   TIME SERIES (GENERIC)
====================================================== */

function updateTimeSeries(
  event: ethereum.Event,
  onUpdate: (w: WeeklyData, m: MonthlyData, y: YearlyData) => void,
): void {
  let week = weekId(event.block.timestamp);
  let month = monthId(event.block.timestamp);
  let year = yearId(event.block.timestamp);

  let w = WeeklyData.load(week);
  if (w == null) {
    w = new WeeklyData(week);
    w.timestamp = event.block.timestamp;
    w.transferCount = ZERO;
    w.transferVolumeRaw = ZERO;
    w.transferVolume = BigDecimal.zero();
    w.stakingVolumeRaw = ZERO;
    w.unstakingVolumeRaw = ZERO;
    w.rewardsClaimedRaw = ZERO;
    w.rewardsClaimed = BigDecimal.zero();
    w.newUsers = ZERO;
    w.cumulativeUsers = ZERO;
    w.tvlStartRaw = ZERO;
    w.tvlEndRaw = ZERO;
    w.tvlPeakRaw = ZERO;
    w.totalTransactions = ZERO;
  }

  let m = MonthlyData.load(month);
  if (m == null) {
    m = new MonthlyData(month);
    m.timestamp = event.block.timestamp;
    m.transferCount = ZERO;
    m.transferVolumeRaw = ZERO;
    m.transferVolume = BigDecimal.zero();
    m.stakingVolumeRaw = ZERO;
    m.unstakingVolumeRaw = ZERO;
    m.rewardsClaimedRaw = ZERO;
    m.rewardsClaimed = BigDecimal.zero();
    m.newUsers = ZERO;
    m.cumulativeUsers = ZERO;
    m.tvlStartRaw = ZERO;
    m.tvlEndRaw = ZERO;
    m.tvlPeakRaw = ZERO;
    m.totalTransactions = ZERO;
  }

  let y = YearlyData.load(year);
  if (y == null) {
    y = new YearlyData(year);
    y.timestamp = event.block.timestamp;
    y.transferCount = ZERO;
    y.transferVolumeRaw = ZERO;
    y.transferVolume = BigDecimal.zero();
    y.stakingVolumeRaw = ZERO;
    y.unstakingVolumeRaw = ZERO;
    y.rewardsClaimedRaw = ZERO;
    y.rewardsClaimed = BigDecimal.zero();
    y.newUsers = ZERO;
    y.cumulativeUsers = ZERO;
    y.tvlStartRaw = ZERO;
    y.tvlEndRaw = ZERO;
    y.tvlPeakRaw = ZERO;
    y.totalTransactions = ZERO;
  }

  onUpdate(w, m, y);

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

    let p = getProtocol(event.block.number, event.block.timestamp);
    p.totalTransactions = p.totalTransactions.plus(ONE);
    p.lastUpdateBlock = event.block.number;
    p.lastUpdateTimestamp = event.block.timestamp;
    p.save();

    updateTimeSeries(event, (w, m, y) => {
      w.totalTransactions = w.totalTransactions.plus(ONE);
      m.totalTransactions = m.totalTransactions.plus(ONE);
      y.totalTransactions = y.totalTransactions.plus(ONE);
    });
  }
}

/* ======================================================
   TRANSFER (SINGLE SOURCE OF SUPPLY TRUTH)
====================================================== */

export function handleTransfer(event: Transfer): void {
  trackTx(event);

  let amount = event.params.amount;

  if (event.params.from != Address.zero()) {
    let from = getOrCreateUser(event.params.from, event);
    from.txCount = from.txCount.plus(ONE);
    from.lastActivityTimestamp = event.block.timestamp;
    from.save();
  }

  if (event.params.to != Address.zero()) {
    let to = getOrCreateUser(event.params.to, event);
    to.txCount = to.txCount.plus(ONE);
    to.lastActivityTimestamp = event.block.timestamp;
    to.save();
  }

  updateTimeSeries(event, (w, m, y) => {
    w.transferCount = w.transferCount.plus(ONE);
    w.transferVolumeRaw = w.transferVolumeRaw.plus(amount);
    w.transferVolume = toDecimal(w.transferVolumeRaw);

    m.transferCount = m.transferCount.plus(ONE);
    m.transferVolumeRaw = m.transferVolumeRaw.plus(amount);
    m.transferVolume = toDecimal(m.transferVolumeRaw);

    y.transferCount = y.transferCount.plus(ONE);
    y.transferVolumeRaw = y.transferVolumeRaw.plus(amount);
    y.transferVolume = toDecimal(y.transferVolumeRaw);
  });
}

export function handleMint(event: Mint): void {
  let p = getProtocol(event.block.number, event.block.timestamp);

  // circulating supply
  p.circulatingSupplyRaw = p.circulatingSupplyRaw.plus(event.params.amount);
  p.circulatingSupply = toDecimal(p.circulatingSupplyRaw);

  let role = event.params.role;

  // Solady bitmap roles
  if (role.equals(BigInt.fromI32(1))) {
    p.totalTeamMintedRaw = p.totalTeamMintedRaw.plus(event.params.amount);
    p.totalTeamMinted = toDecimal(p.totalTeamMintedRaw);
  } else if (role.equals(BigInt.fromI32(2))) {
    p.totalTreasuryMintedRaw = p.totalTreasuryMintedRaw.plus(
      event.params.amount,
    );
    p.totalTreasuryMinted = toDecimal(p.totalTreasuryMintedRaw);
  } else if (role.equals(BigInt.fromI32(4))) {
    p.totalDAOmintedRaw = p.totalDAOmintedRaw.plus(event.params.amount);
    p.totalDAOminted = toDecimal(p.totalDAOmintedRaw);
  }

  p.totalTransactions = p.totalTransactions.plus(ONE);
  p.lastUpdateBlock = event.block.number;
  p.lastUpdateTimestamp = event.block.timestamp;
  p.save();
}

export function handleBurn(event: Burn): void {
  trackTx(event);

  let p = getProtocol(event.block.number, event.block.timestamp);

  p.totalBurnedRaw = p.totalBurnedRaw.plus(event.params.amount);
  p.totalBurned = toDecimal(p.totalBurnedRaw);

  p.circulatingSupplyRaw = p.circulatingSupplyRaw.minus(event.params.amount);
  p.circulatingSupply = toDecimal(p.circulatingSupplyRaw);

  p.save();
}

export function handleTreasuryFee(event: TreasuryFee): void {
  trackTx(event);

  let p = getProtocol(event.block.number, event.block.timestamp);
  p.totalTreasuryFeeRaw = p.totalTreasuryFeeRaw.plus(event.params.amount);
  p.totalTreasuryFee = toDecimal(p.totalTreasuryFeeRaw);
  p.save();
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
   VESTING
====================================================== */

export function handleVestingCreated(event: VestingCreated): void {
  trackTx(event);

  let user = getOrCreateUser(event.params.beneficiary, event);

  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let v = new VestingPosition(id);

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

  let p = getProtocol(event.block.number, event.block.timestamp);
  p.totalVestingAllocatedRaw = p.totalVestingAllocatedRaw.plus(
    event.params.totalAllocation,
  );
  p.totalVestingAllocated = toDecimal(p.totalVestingAllocatedRaw);
  p.totalVestedRaw = p.totalVestedRaw.plus(event.params.totalAllocation);
  p.totalVested = toDecimal(p.totalVestedRaw);
  updateTVL(p);
  p.save();

  user.hasActiveVesting = true;
  user.totalVestingAllocatedRaw = user.totalVestingAllocatedRaw.plus(
    event.params.totalAllocation,
  );
  user.save();
}

export function handleTokensClaimed(event: TokensClaimed): void {
  trackTx(event);

  let p = getProtocol(event.block.number, event.block.timestamp);
  p.totalVestingClaimedRaw = p.totalVestingClaimedRaw.plus(event.params.amount);
  p.totalVestingClaimed = toDecimal(p.totalVestingClaimedRaw);
  p.totalVestedRaw = p.totalVestedRaw.minus(event.params.amount);
  p.totalVested = toDecimal(p.totalVestedRaw);
  updateTVL(p);
  p.save();

  let user = getOrCreateUser(event.params.beneficiary, event);
  user.totalVestingClaimedRaw = user.totalVestingClaimedRaw.plus(
    event.params.amount,
  );
  user.save();
}

export function handleVestingRevoked(event: VestingRevoked): void {
  trackTx(event);

  let user = getOrCreateUser(event.params.beneficiary, event);
  user.hasActiveVesting = false;
  user.save();
}

/* ======================================================
   STAKING
====================================================== */

export function handleStaked(event: Staked): void {
  trackTx(event);

  let user = getOrCreateUser(event.params.user, event);
  let lock = getOrCreateLockStat(event.params.lockOption);

  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let s = new StakingPosition(id);

  s.user = user.id;
  s.userAddress = event.params.user;
  s.amountRaw = event.params.amount;
  s.amount = toDecimal(event.params.amount);
  s.lockOption = event.params.lockOption;
  s.unlockTime = event.params.unlockTime;
  s.active = true;
  s.totalRewardsClaimedRaw = ZERO;
  s.totalRewardsClaimed = BigDecimal.zero();
  s.stakedAt = event.block.timestamp;
  s.stakedAtBlock = event.block.number;
  s.unstakedAt = null;
  s.save();

  let p = getProtocol(event.block.number, event.block.timestamp);
  p.totalStakedRaw = p.totalStakedRaw.plus(event.params.amount);
  p.totalStaked = toDecimal(p.totalStakedRaw);
  updateTVL(p);
  p.save();

  lock.totalLockedRaw = lock.totalLockedRaw.plus(event.params.amount);
  lock.totalLocked = toDecimal(lock.totalLockedRaw);
  lock.activePositions = lock.activePositions.plus(ONE);
  lock.save();

  user.hasActiveStake = true;
  user.totalStakedRaw = user.totalStakedRaw.plus(event.params.amount);
  user.save();
}

export function handleUnstaked(event: Unstaked): void {
  trackTx(event);

  // let lock = getOrCreateLockStat(event.params.lockOption);
  // lock.totalLockedRaw = lock.totalLockedRaw.minus(event.params.amount);
  // lock.totalLocked = toDecimal(lock.totalLockedRaw);
  // lock.activePositions = lock.activePositions.minus(ONE);
  // lock.save();

  let p = getProtocol(event.block.number, event.block.timestamp);
  p.totalStakedRaw = p.totalStakedRaw.minus(event.params.amount);
  p.totalStaked = toDecimal(p.totalStakedRaw);
  updateTVL(p);
  p.save();

  let user = getOrCreateUser(event.params.user, event);
  user.totalUnstakedRaw = user.totalUnstakedRaw.plus(event.params.amount);
  user.hasActiveStake = false;
  user.save();
}

export function handleRewardClaimed(event: RewardClaimed): void {
  trackTx(event);

  // let lock = getOrCreateLockStat(event.params.lockOption);
  // lock.totalRewardsDistributedRaw = lock.totalRewardsDistributedRaw.plus(
  //   event.params.reward,
  // );
  // lock.totalRewardsDistributed = toDecimal(lock.totalRewardsDistributedRaw);
  // lock.save();

  let p = getProtocol(event.block.number, event.block.timestamp);
  p.totalRewardsDistributedRaw = p.totalRewardsDistributedRaw.plus(
    event.params.reward,
  );
  p.totalRewardsDistributed = toDecimal(p.totalRewardsDistributedRaw);
  p.save();

  let user = getOrCreateUser(event.params.user, event);
  user.totalRewardsClaimedRaw = user.totalRewardsClaimedRaw.plus(
    event.params.reward,
  );
  user.totalRewardsClaimed = toDecimal(user.totalRewardsClaimedRaw);
  user.save();
}

export function handleCompounded(event: Compounded): void {
  trackTx(event);

  let p = getProtocol(event.block.number, event.block.timestamp);
  p.totalStakedRaw = p.totalStakedRaw.plus(event.params.rewardAdded);
  p.totalStaked = toDecimal(p.totalStakedRaw);
  updateTVL(p);
  p.save();
}

export function handleRewardsDeposited(event: RewardsDeposited): void {
  trackTx(event);
}
