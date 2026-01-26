// import {
//   Transfer,
//   RoleGranted,
//   RoleRevoked,
//   RevenueMint,
//   TreasuryFee,
//   Burn,
//   Mint,
// } from "../../generated/CAPX/CAPX";

// import {
//   VestingCreated,
//   TokensClaimed,
//   VestingRevoked,
// } from "../../generated/CAPXVesting/CAPXVesting";

// import {
//   Staked,
//   Unstaked,
//   RewardClaimed,
//   RewardsDeposited,
//   Compounded,
// } from "../../generated/CAPXStaking/CAPXStaking";

// import {
//   Protocol,
//   User,
//   RoleAccount,
//   VestingPosition,
//   StakingPosition,
//   StakingStats,
//   VestingStats,
//   Transaction,
//   TransferEvent,
//   VestingEvent,
//   StakingEvent,
//   RevenueMintEvent,
//   TreasuryFeeEvent,
//   DailyData,
//   WeeklyData,
//   MonthlyData,
//   YearlyData,
//   DailyUserActivity,
//   MintEvent,
//   BurnEvent,
// } from "../../generated/schema";

// import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

// /* ======================================================
//    CONSTANTS
// ====================================================== */

// const PROTOCOL_ID = "CAPX";
// const STAKING_STATS_ID = "STAKING";
// const VESTING_STATS_ID = "VESTING";

// const ZERO = BigInt.zero();
// const ONE = BigInt.fromI32(1);
// const ZERO_ADDRESS = Address.zero();

// /* ======================================================
//    HELPERS
// ====================================================== */

// function txId(hash: Bytes, logIndex: BigInt): string {
//   return hash.toHexString() + "-" + logIndex.toString();
// }

// function txHashString(hash: Bytes): string {
//   return hash.toHexString();
// }

// /* ======================================================
//    PROTOCOL
// ====================================================== */

// function getProtocol(): Protocol {
//   let p = Protocol.load(PROTOCOL_ID);
//   if (p == null) {
//     p = new Protocol(PROTOCOL_ID);
//     p.totalUsers = ZERO;
//     p.totalTransactions = ZERO;
//     p.totalTVL = ZERO;
//     p.totalStaked = ZERO;
//     p.totalVested = ZERO;
//     p.totalActiveStakers = ZERO;
//     p.totalRewardsDistributed = ZERO;
//     p.totalRewardsDeposited = ZERO;
//     p.availableRewards = ZERO;
//     p.circulatingSupply = ZERO;
//     p.totalBurned = ZERO;
//     p.teamMinted = ZERO;
//     p.treasuryMinted = ZERO;
//     p.daoMinted = ZERO;
//     p.revenueMinted = ZERO;
//     p.totalTreasuryFees = ZERO;
//     p.lastUpdateBlock = ZERO;
//     p.lastUpdateTimestamp = ZERO;
//     p.save();
//   }
//   return p;
// }

// function updateProtocolTVL(p: Protocol): void {
//   p.totalTVL = p.totalStaked.plus(p.totalVested);
// }

// /* ======================================================
//    TRANSACTION (NO DOUBLE COUNTING)
// ====================================================== */

// function trackTx(hash: Bytes, block: BigInt, ts: BigInt): void {
//   let id = txHashString(hash);
//   let tx = Transaction.load(id);
//   if (tx != null) return;

//   tx = new Transaction(id);
//   tx.blockNumber = block;
//   tx.timestamp = ts;
//   tx.save();

//   let protocol = getProtocol();
//   protocol.totalTransactions = protocol.totalTransactions.plus(ONE);
//   protocol.lastUpdateBlock = block;
//   protocol.lastUpdateTimestamp = ts;
//   protocol.save();
// }

// /* ======================================================
//    TIME-SERIES HELPERS
// ====================================================== */

// function getOrCreateDaily(ts: BigInt): DailyData {
//   let dayIndex = ts.div(BigInt.fromI32(86400));
//   let id = dayIndex.toString();
//   let d = DailyData.load(id);
//   if (d == null) {
//     d = new DailyData(id);
//     d.timestamp = ts;
//     d.dayIndex = dayIndex;
//     d.transferCount = 0;
//     d.transferVolume = ZERO;
//     d.stakingVolume = ZERO;
//     d.unstakingVolume = ZERO;
//     d.rewardsClaimed = ZERO;
//     d.vestingClaimed = ZERO;
//     d.activeUsers = 0;
//     d.newUsers = 0;
//     d.cumulativeUsers = 0;
//     d.tvlSnapshot = ZERO;
//     d.stakedSnapshot = ZERO;
//     d.totalTransactions = 0;
//   }
//   let p = getProtocol();
//   d.tvlSnapshot = p.totalTVL;
//   d.stakedSnapshot = p.totalStaked;
//   return d;
// }

// function getOrCreateWeekly(ts: BigInt): WeeklyData {
//   let weekIndex = ts.div(BigInt.fromI32(604800));
//   let id = weekIndex.toString();
//   let w = WeeklyData.load(id);
//   if (w == null) {
//     w = new WeeklyData(id);
//     w.timestamp = ts;
//     w.weekIndex = weekIndex;
//     w.transferCount = 0;
//     w.transferVolume = ZERO;
//     w.stakingVolume = ZERO;
//     w.unstakingVolume = ZERO;
//     w.rewardsClaimed = ZERO;
//     w.vestingClaimed = ZERO;
//     w.newUsers = 0;
//     w.cumulativeUsers = 0;
//     w.peakActiveUsers = 0;
//     w.tvlSnapshot = ZERO;
//     w.totalTransactions = 0;
//   }
//   let p = getProtocol();
//   w.tvlSnapshot = p.totalTVL;
//   return w;
// }

// function getOrCreateMonthly(ts: BigInt): MonthlyData {
//   let monthIndex = ts.div(BigInt.fromI32(2592000));
//   let id = monthIndex.toString();
//   let m = MonthlyData.load(id);
//   if (m == null) {
//     m = new MonthlyData(id);
//     m.timestamp = ts;
//     m.monthIndex = monthIndex;
//     m.transferCount = 0;
//     m.transferVolume = ZERO;
//     m.stakingVolume = ZERO;
//     m.unstakingVolume = ZERO;
//     m.rewardsClaimed = ZERO;
//     m.vestingClaimed = ZERO;
//     m.newVestingPositions = 0;
//     m.newUsers = 0;
//     m.cumulativeUsers = 0;
//     m.peakActiveUsers = 0;
//     m.tvlStart = ZERO;
//     m.tvlEnd = ZERO;
//     m.tvlPeak = ZERO;
//     m.totalTransactions = 0;
//   }
//   let p = getProtocol();
//   if (m.tvlStart.equals(ZERO)) m.tvlStart = p.totalTVL;
//   m.tvlEnd = p.totalTVL;
//   if (p.totalTVL.gt(m.tvlPeak)) m.tvlPeak = p.totalTVL;
//   return m;
// }

// function getOrCreateYearly(ts: BigInt): YearlyData {
//   let yearIndex = ts.div(BigInt.fromI32(31536000));
//   let id = yearIndex.toString();
//   let y = YearlyData.load(id);
//   if (y == null) {
//     y = new YearlyData(id);
//     y.timestamp = ts;
//     y.yearIndex = yearIndex;
//     y.transferCount = 0;
//     y.transferVolume = ZERO;
//     y.stakingVolume = ZERO;
//     y.unstakingVolume = ZERO;
//     y.rewardsClaimed = ZERO;
//     y.vestingClaimed = ZERO;
//     y.newUsers = 0;
//     y.cumulativeUsers = 0;
//     y.peakActiveUsers = 0;
//     y.tvlSnapshot = ZERO;
//     y.totalTransactions = 0;
//   }
//   let p = getProtocol();
//   y.tvlSnapshot = p.totalTVL;
//   return y;
// }

// function markDailyActivity(
//   user: Address,
//   ts: BigInt,
//   transferred: boolean,
//   staked: boolean,
//   claimed: boolean,
// ): void {
//   let dayIndex = ts.div(BigInt.fromI32(86400)).toString();
//   let id = dayIndex + "-" + user.toHexString();
//   let a = DailyUserActivity.load(id);
//   let created = false;

//   if (a == null) {
//     a = new DailyUserActivity(id);
//     a.day = dayIndex;
//     a.user = user;
//     a.timestamp = ts;
//     a.hasTransferred = false;
//     a.hasStaked = false;
//     a.hasClaimed = false;
//     created = true;
//   }

//   let day = getOrCreateDaily(ts);

//   if (created) {
//     day.activeUsers = day.activeUsers + 1;
//     let w = getOrCreateWeekly(ts);
//     if (w.peakActiveUsers < day.activeUsers)
//       w.peakActiveUsers = day.activeUsers;
//     w.save();
//     let m = getOrCreateMonthly(ts);
//     if (m.peakActiveUsers < day.activeUsers)
//       m.peakActiveUsers = day.activeUsers;
//     m.save();
//     let y = getOrCreateYearly(ts);
//     if (y.peakActiveUsers < day.activeUsers)
//       y.peakActiveUsers = day.activeUsers;
//     y.save();
//     day.save();
//   }

//   if (transferred && !a.hasTransferred) a.hasTransferred = true;
//   if (staked && !a.hasStaked) a.hasStaked = true;
//   if (claimed && !a.hasClaimed) a.hasClaimed = true;
//   a.save();
// }

// /* ======================================================
//    USERS
// ====================================================== */

// function getOrCreateUser(addr: Address, block: BigInt, ts: BigInt): User {
//   let id = addr.toHexString();
//   let u = User.load(id);

//   if (u == null) {
//     u = new User(id);
//     u.address = addr;
//     u.firstSeenBlock = block;
//     u.firstSeenTimestamp = ts;
//     u.txCount = ZERO;
//     u.lastActivityTimestamp = ts;
//     u.hasActiveStake = false;
//     u.hasActiveVesting = false;
//     u.totalStaked = ZERO;
//     u.totalUnstaked = ZERO;
//     u.totalRewardsClaimed = ZERO;
//     u.totalRewardsCompounded = ZERO;
//     u.totalVestingAllocated = ZERO;
//     u.totalVestingClaimed = ZERO;
//     u.save();

//     let p = getProtocol();
//     p.totalUsers = p.totalUsers.plus(ONE);
//     p.save();

//     let day = getOrCreateDaily(ts);
//     day.newUsers = day.newUsers + 1;
//     day.cumulativeUsers = day.cumulativeUsers + 1;
//     day.save();

//     let w = getOrCreateWeekly(ts);
//     w.newUsers = w.newUsers + 1;
//     w.cumulativeUsers = w.cumulativeUsers + 1;
//     w.save();

//     let m = getOrCreateMonthly(ts);
//     m.newUsers = m.newUsers + 1;
//     m.cumulativeUsers = m.cumulativeUsers + 1;
//     m.save();

//     let y = getOrCreateYearly(ts);
//     y.newUsers = y.newUsers + 1;
//     y.cumulativeUsers = y.cumulativeUsers + 1;
//     y.save();
//   } else {
//     u.lastActivityTimestamp = ts;
//   }

//   u.txCount = u.txCount.plus(ONE);
//   u.save();
//   return u;
// }

// /* ======================================================
//    ROLES
// ====================================================== */

// function handleRoleUpdate(
//   account: Address,
//   role: BigInt,
//   granted: boolean,
//   block: BigInt,
//   ts: BigInt,
// ): void {
//   let id = role.toString() + "-" + account.toHexString();
//   let r = RoleAccount.load(id);

//   if (r == null) {
//     r = new RoleAccount(id);
//     r.role = role;
//     r.account = account;
//     r.assignedAtBlock = block;
//     r.assignedAtTimestamp = ts;
//   }

//   r.isActive = granted;
//   if (!granted) {
//     r.revokedAtBlock = block;
//     r.revokedAtTimestamp = ts;
//   }
//   r.save();
// }

// export function handleRoleGranted(event: RoleGranted): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);
//   handleRoleUpdate(
//     event.params.account,
//     event.params.role,
//     true,
//     event.block.number,
//     event.block.timestamp,
//   );
//   getOrCreateUser(
//     event.params.account,
//     event.block.number,
//     event.block.timestamp,
//   );
// }

// export function handleRoleRevoked(event: RoleRevoked): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);
//   handleRoleUpdate(
//     event.params.account,
//     event.params.role,
//     false,
//     event.block.number,
//     event.block.timestamp,
//   );
//   getOrCreateUser(
//     event.params.account,
//     event.block.number,
//     event.block.timestamp,
//   );
// }

// /* ======================================================
//    CAPX TOKEN EVENTS
// ====================================================== */

// export function handleTransfer(event: Transfer): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);

//   let protocol = getProtocol();

//   if (event.params.from.equals(ZERO_ADDRESS)) {
//     protocol.circulatingSupply = protocol.circulatingSupply.plus(
//       event.params.amount,
//     );
//   }

//   if (event.params.to.equals(ZERO_ADDRESS)) {
//     protocol.circulatingSupply = protocol.circulatingSupply.minus(
//       event.params.amount,
//     );
//   }

//   protocol.save();

//   if (!event.params.from.equals(ZERO_ADDRESS)) {
//     getOrCreateUser(
//       event.params.from,
//       event.block.number,
//       event.block.timestamp,
//     );
//     markDailyActivity(
//       event.params.from,
//       event.block.timestamp,
//       true,
//       false,
//       false,
//     );
//   }

//   if (!event.params.to.equals(ZERO_ADDRESS)) {
//     getOrCreateUser(event.params.to, event.block.number, event.block.timestamp);
//     markDailyActivity(
//       event.params.to,
//       event.block.timestamp,
//       true,
//       false,
//       false,
//     );
//   }

//   let tev = new TransferEvent(txId(event.transaction.hash, event.logIndex));
//   tev.from = event.params.from;
//   tev.to = event.params.to;
//   tev.amount = event.params.amount;
//   tev.blockNumber = event.block.number;
//   tev.blockTimestamp = event.block.timestamp;
//   tev.transactionHash = event.transaction.hash;
//   tev.save();

//   let day = getOrCreateDaily(event.block.timestamp);
//   day.transferCount = day.transferCount + 1;
//   day.transferVolume = day.transferVolume.plus(event.params.amount);
//   day.totalTransactions = day.totalTransactions + 1;
//   day.save();

//   let w = getOrCreateWeekly(event.block.timestamp);
//   w.transferCount = w.transferCount + 1;
//   w.transferVolume = w.transferVolume.plus(event.params.amount);
//   w.totalTransactions = w.totalTransactions + 1;
//   w.save();

//   let m = getOrCreateMonthly(event.block.timestamp);
//   m.transferCount = m.transferCount + 1;
//   m.transferVolume = m.transferVolume.plus(event.params.amount);
//   m.totalTransactions = m.totalTransactions + 1;
//   m.save();

//   let y = getOrCreateYearly(event.block.timestamp);
//   y.transferCount = y.transferCount + 1;
//   y.transferVolume = y.transferVolume.plus(event.params.amount);
//   y.totalTransactions = y.totalTransactions + 1;
//   y.save();
// }

// export function handleBurn(event: Burn): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);

//   let p = getProtocol();
//   p.totalBurned = p.totalBurned.plus(event.params.amount);
//   p.save();

//   let b = new BurnEvent(txId(event.transaction.hash, event.logIndex));
//   b.from = event.params.from;
//   b.amount = event.params.amount;
//   b.blockNumber = event.block.number;
//   b.blockTimestamp = event.block.timestamp;
//   b.transactionHash = event.transaction.hash;
//   b.save();
// }

// /* ======================================================
//    REVENUE / MINT / FEES
// ====================================================== */

// export function handleRevenueMint(event: RevenueMint): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);

//   let p = getProtocol();
//   p.revenueMinted = p.revenueMinted.plus(event.params.revenue);
//   p.save();

//   let r = new RevenueMintEvent(txId(event.transaction.hash, event.logIndex));
//   r.tokensMinted = event.params.tokensMinted;
//   r.revenue = event.params.revenue;
//   r.marketValue = event.params.marketValue;
//   r.blockNumber = event.block.number;
//   r.blockTimestamp = event.block.timestamp;
//   r.transactionHash = event.transaction.hash;
//   r.save();
// }

// export function handleTreasuryFee(event: TreasuryFee): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);

//   let p = getProtocol();
//   p.totalTreasuryFees = p.totalTreasuryFees.plus(event.params.amount);
//   p.save();

//   let t = new TreasuryFeeEvent(txId(event.transaction.hash, event.logIndex));
//   t.from = event.params.from;
//   t.to = event.params.to;
//   t.amount = event.params.amount;
//   t.blockNumber = event.block.number;
//   t.blockTimestamp = event.block.timestamp;
//   t.transactionHash = event.transaction.hash;
//   t.save();

//   let day = getOrCreateDaily(event.block.timestamp);
//   day.transferCount = day.transferCount + 1;
//   day.transferVolume = day.transferVolume.plus(event.params.amount);
//   day.totalTransactions = day.totalTransactions + 1;
//   day.save();

//   let w = getOrCreateWeekly(event.block.timestamp);
//   w.transferCount = w.transferCount + 1;
//   w.transferVolume = w.transferVolume.plus(event.params.amount);
//   w.totalTransactions = w.totalTransactions + 1;
//   w.save();

//   let m = getOrCreateMonthly(event.block.timestamp);
//   m.transferCount = m.transferCount + 1;
//   m.transferVolume = m.transferVolume.plus(event.params.amount);
//   m.totalTransactions = m.totalTransactions + 1;
//   m.save();

//   let y = getOrCreateYearly(event.block.timestamp);
//   y.transferCount = y.transferCount + 1;
//   y.transferVolume = y.transferVolume.plus(event.params.amount);
//   y.totalTransactions = y.totalTransactions + 1;
//   y.save();
// }

// export function handleMint(event: Mint): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);

//   let p = getProtocol();
//   let role = event.params.role;

//   if (role.equals(BigInt.fromI32(1))) {
//     p.teamMinted = p.teamMinted.plus(event.params.amount);
//   } else if (role.equals(BigInt.fromI32(2))) {
//     p.treasuryMinted = p.treasuryMinted.plus(event.params.amount);
//   } else if (role.equals(BigInt.fromI32(4))) {
//     p.daoMinted = p.daoMinted.plus(event.params.amount);
//   }
//   p.save();

//   let me = new MintEvent(txId(event.transaction.hash, event.logIndex));
//   me.to = event.params.to;
//   me.amount = event.params.amount;
//   me.role = event.params.role;
//   me.blockNumber = event.block.number;
//   me.blockTimestamp = event.block.timestamp;
//   me.transactionHash = event.transaction.hash;
//   me.save();
// }

// /* ======================================================
//    VESTING
// ====================================================== */

// function getVestingStats(): VestingStats {
//   let v = VestingStats.load(VESTING_STATS_ID);
//   if (v == null) {
//     v = new VestingStats(VESTING_STATS_ID);
//     v.totalAllocated = ZERO;
//     v.totalClaimed = ZERO;
//     v.totalRevoked = ZERO;
//     v.activePositions = 0;
//     v.revokedPositions = 0;
//     v.save();
//   }
//   return v;
// }

// export function handleVestingCreated(event: VestingCreated): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);

//   let id = event.params.beneficiary.toHexString();
//   let vesting = new VestingPosition(id);

//   vesting.user = event.params.beneficiary;
//   vesting.beneficiary = event.params.beneficiary;
//   vesting.totalAllocated = event.params.totalAllocation;
//   vesting.totalClaimed = ZERO;
//   vesting.startTime = event.params.startTime;
//   vesting.cliffEnd = event.params.cliffEnd;
//   vesting.endTime = event.params.vestingEnd;
//   vesting.revoked = false;
//   vesting.active = true;
//   vesting.createdAt = event.block.timestamp;
//   vesting.createdAtBlock = event.block.number;
//   vesting.save();

//   let protocol = getProtocol();
//   protocol.totalVested = protocol.totalVested.plus(
//     event.params.totalAllocation,
//   );
//   updateProtocolTVL(protocol);
//   protocol.save();

//   let stats = getVestingStats();
//   stats.totalAllocated = stats.totalAllocated.plus(
//     event.params.totalAllocation,
//   );
//   stats.activePositions += 1;
//   stats.save();

//   let user = getOrCreateUser(
//     event.params.beneficiary,
//     event.block.number,
//     event.block.timestamp,
//   );
//   user.hasActiveVesting = true;
//   user.totalVestingAllocated = user.totalVestingAllocated.plus(
//     event.params.totalAllocation,
//   );
//   user.vestingPosition = id;
//   user.save();

//   let m = getOrCreateMonthly(event.block.timestamp);
//   m.newVestingPositions = m.newVestingPositions + 1;
//   m.save();

//   let ve = new VestingEvent(txId(event.transaction.hash, event.logIndex));
//   ve.beneficiary = event.params.beneficiary;
//   ve.type = "CREATED";
//   ve.amount = event.params.totalAllocation;
//   ve.totalClaimed = ZERO;
//   ve.timestamp = event.block.timestamp;
//   ve.blockNumber = event.block.number;
//   ve.transactionHash = event.transaction.hash;
//   ve.save();
// }

// export function handleTokensClaimed(event: TokensClaimed): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);

//   let vestingId = event.params.beneficiary.toHexString();
//   let vesting = VestingPosition.load(vestingId);
//   if (vesting == null || vesting.revoked) return;

//   vesting.totalClaimed = event.params.totalClaimed;
//   if (vesting.totalClaimed.ge(vesting.totalAllocated)) {
//     vesting.active = false;
//   }
//   vesting.save();

//   let protocol = getProtocol();
//   protocol.totalVested = protocol.totalVested.minus(event.params.amount);
//   updateProtocolTVL(protocol);
//   protocol.save();

//   let stats = getVestingStats();
//   stats.totalClaimed = stats.totalClaimed.plus(event.params.amount);
//   stats.save();

//   let user = getOrCreateUser(
//     event.params.beneficiary,
//     event.block.number,
//     event.block.timestamp,
//   );
//   user.totalVestingClaimed = user.totalVestingClaimed.plus(event.params.amount);
//   if (!vesting.active) {
//     user.hasActiveVesting = false;
//     user.vestingPosition = null;
//   }
//   user.save();

//   let ve = new VestingEvent(txId(event.transaction.hash, event.logIndex));
//   ve.beneficiary = event.params.beneficiary;
//   ve.type = "CLAIMED";
//   ve.amount = event.params.amount;
//   ve.totalClaimed = event.params.totalClaimed;
//   ve.timestamp = event.block.timestamp;
//   ve.blockNumber = event.block.number;
//   ve.transactionHash = event.transaction.hash;
//   ve.save();

//   let day = getOrCreateDaily(event.block.timestamp);
//   day.vestingClaimed = day.vestingClaimed.plus(event.params.amount);
//   day.totalTransactions = day.totalTransactions + 1;
//   day.save();

//   let w = getOrCreateWeekly(event.block.timestamp);
//   w.vestingClaimed = w.vestingClaimed.plus(event.params.amount);
//   w.totalTransactions = w.totalTransactions + 1;
//   w.save();

//   let m = getOrCreateMonthly(event.block.timestamp);
//   m.vestingClaimed = m.vestingClaimed.plus(event.params.amount);
//   m.totalTransactions = m.totalTransactions + 1;
//   m.save();

//   let y = getOrCreateYearly(event.block.timestamp);
//   y.vestingClaimed = y.vestingClaimed.plus(event.params.amount);
//   y.totalTransactions = y.totalTransactions + 1;
//   y.save();

//   markDailyActivity(
//     event.params.beneficiary,
//     event.block.timestamp,
//     false,
//     false,
//     true,
//   );
// }

// export function handleVestingRevoked(event: VestingRevoked): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);

//   let vestingId = event.params.beneficiary.toHexString();
//   let vesting = VestingPosition.load(vestingId);
//   if (vesting == null) return;

//   vesting.revoked = true;
//   vesting.active = false;
//   vesting.revokedAt = event.block.timestamp;
//   vesting.save();

//   let protocol = getProtocol();
//   protocol.totalVested = protocol.totalVested.minus(event.params.amountRevoked);
//   updateProtocolTVL(protocol);
//   protocol.save();

//   let stats = getVestingStats();
//   stats.totalRevoked = stats.totalRevoked.plus(event.params.amountRevoked);
//   if (stats.activePositions > 0) stats.activePositions -= 1;
//   stats.revokedPositions += 1;
//   stats.save();

//   let user = User.load(event.params.beneficiary.toHexString());
//   if (user != null) {
//     user.hasActiveVesting = false;
//     user.vestingPosition = null;
//     user.save();
//   }

//   let ve = new VestingEvent(txId(event.transaction.hash, event.logIndex));
//   ve.beneficiary = event.params.beneficiary;
//   ve.type = "REVOKED";
//   ve.amount = event.params.amountRevoked;
//   ve.totalClaimed = ZERO;
//   ve.timestamp = event.block.timestamp;
//   ve.blockNumber = event.block.number;
//   ve.transactionHash = event.transaction.hash;
//   ve.save();

//   // count as a transaction in time-series
//   let day = getOrCreateDaily(event.block.timestamp);
//   day.totalTransactions = day.totalTransactions + 1;
//   day.save();

//   let w = getOrCreateWeekly(event.block.timestamp);
//   w.totalTransactions = w.totalTransactions + 1;
//   w.save();

//   let m = getOrCreateMonthly(event.block.timestamp);
//   m.totalTransactions = m.totalTransactions + 1;
//   m.save();

//   let y = getOrCreateYearly(event.block.timestamp);
//   y.totalTransactions = y.totalTransactions + 1;
//   y.save();

//   markDailyActivity(
//     event.params.beneficiary,
//     event.block.timestamp,
//     false,
//     false,
//     false,
//   );
// }

// /* ======================================================
//    STAKING
// ====================================================== */

// function getStakingStats(): StakingStats {
//   let s = StakingStats.load(STAKING_STATS_ID);
//   if (s == null) {
//     s = new StakingStats(STAKING_STATS_ID);
//     s.totalStaked = ZERO;
//     s.activeStakers = 0;
//     s.flexStaked = ZERO;
//     s.flexStakers = 0;
//     s.days30Staked = ZERO;
//     s.days30Stakers = 0;
//     s.days90Staked = ZERO;
//     s.days90Stakers = 0;
//     s.days180Staked = ZERO;
//     s.days180Stakers = 0;
//     s.totalRewardsDistributed = ZERO;
//     s.totalRewardsDeposited = ZERO;
//     s.availableRewards = ZERO;
//     s.baseAPR = ZERO;
//     s.avgEffectiveAPR = ZERO;
//     s.save();
//   }
//   return s;
// }

// export function handleStaked(event: Staked): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);

//   // Load existing position if present
//   let userId = event.params.user.toHexString();
//   let pos = StakingPosition.load(userId);
//   let wasActive = pos != null && pos.active;

//   if (pos == null) {
//     pos = new StakingPosition(userId);
//     pos.user = event.params.user;
//     pos.amount = event.params.amount;
//     pos.lockOption = event.params.lockOption;
//     pos.unlockTime = event.params.unlockTime;
//     pos.lastClaimTime = event.block.timestamp;
//     pos.active = true;
//     pos.stakedAt = event.block.timestamp;
//     pos.stakedAtBlock = event.block.number;
//     pos.unstakedAt = null;
//     pos.totalRewardsClaimed = ZERO;
//     pos.totalRewardsCompounded = ZERO;
//     pos.effectiveAPR = ZERO;
//   } else {
//     // update existing
//     pos.amount = pos.amount.plus(event.params.amount);
//     pos.lockOption = event.params.lockOption;
//     pos.unlockTime = event.params.unlockTime;
//     pos.lastClaimTime = event.block.timestamp;
//     pos.active = true;
//   }
//   pos.save();

//   // Protocol
//   let protocol = getProtocol();
//   protocol.totalStaked = protocol.totalStaked.plus(event.params.amount);
//   if (!wasActive)
//     protocol.totalActiveStakers = protocol.totalActiveStakers.plus(ONE);
//   updateProtocolTVL(protocol);
//   protocol.save();

//   // Staking stats
//   let stats = getStakingStats();
//   stats.totalStaked = stats.totalStaked.plus(event.params.amount);

//   if (!wasActive) {
//     stats.activeStakers += 1;
//     if (event.params.lockOption == 0) {
//       stats.flexStakers += 1;
//       stats.flexStaked = stats.flexStaked.plus(event.params.amount);
//     } else if (event.params.lockOption == 1) {
//       stats.days30Stakers += 1;
//       stats.days30Staked = stats.days30Staked.plus(event.params.amount);
//     } else if (event.params.lockOption == 2) {
//       stats.days90Stakers += 1;
//       stats.days90Staked = stats.days90Staked.plus(event.params.amount);
//     } else if (event.params.lockOption == 3) {
//       stats.days180Stakers += 1;
//       stats.days180Staked = stats.days180Staked.plus(event.params.amount);
//     } else {
//       // fallback to flex bucket
//       stats.flexStaked = stats.flexStaked.plus(event.params.amount);
//     }
//   } else {
//     // existing active staker: just increase amounts in bucket
//     if (pos.lockOption == 0) {
//       stats.flexStaked = stats.flexStaked.plus(event.params.amount);
//     } else if (pos.lockOption == 1) {
//       stats.days30Staked = stats.days30Staked.plus(event.params.amount);
//     } else if (pos.lockOption == 2) {
//       stats.days90Staked = stats.days90Staked.plus(event.params.amount);
//     } else if (pos.lockOption == 3) {
//       stats.days180Staked = stats.days180Staked.plus(event.params.amount);
//     } else {
//       stats.flexStaked = stats.flexStaked.plus(event.params.amount);
//     }
//   }
//   stats.save();

//   // Keep protocol.totalActiveStakers in sync with stats.activeStakers
//   protocol.totalActiveStakers = BigInt.fromI32(stats.activeStakers);
//   protocol.save();

//   // User
//   let user = getOrCreateUser(
//     event.params.user,
//     event.block.number,
//     event.block.timestamp,
//   );
//   if (!wasActive) {
//     user.hasActiveStake = true;
//     user.stakingPosition = userId;
//   }
//   user.totalStaked = user.totalStaked.plus(event.params.amount);
//   user.save();

//   // Immutable staking event
//   let se = new StakingEvent(txId(event.transaction.hash, event.logIndex));
//   se.user = event.params.user;
//   se.type = "STAKE";
//   se.amount = event.params.amount;
//   se.lockOption = event.params.lockOption;
//   se.unlockTime = event.params.unlockTime;
//   se.timestamp = event.block.timestamp;
//   se.blockNumber = event.block.number;
//   se.transactionHash = event.transaction.hash;
//   se.save();

//   // time-series
//   let day = getOrCreateDaily(event.block.timestamp);
//   day.stakingVolume = day.stakingVolume.plus(event.params.amount);
//   day.totalTransactions = day.totalTransactions + 1;
//   day.save();

//   let w = getOrCreateWeekly(event.block.timestamp);
//   w.stakingVolume = w.stakingVolume.plus(event.params.amount);
//   w.totalTransactions = w.totalTransactions + 1;
//   w.save();

//   let m = getOrCreateMonthly(event.block.timestamp);
//   m.stakingVolume = m.stakingVolume.plus(event.params.amount);
//   m.totalTransactions = m.totalTransactions + 1;
//   m.save();

//   let y = getOrCreateYearly(event.block.timestamp);
//   y.stakingVolume = y.stakingVolume.plus(event.params.amount);
//   y.totalTransactions = y.totalTransactions + 1;
//   y.save();

//   // activity dedupe
//   markDailyActivity(
//     event.params.user,
//     event.block.timestamp,
//     false,
//     true,
//     false,
//   );
// }

// export function handleUnstaked(event: Unstaked): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);

//   let userId = event.params.user.toHexString();
//   let pos = StakingPosition.load(userId);
//   if (pos == null) return;

//   let amount = event.params.amount;
//   let actual = amount;
//   if (amount.gt(pos.amount)) {
//     actual = pos.amount;
//   }

//   pos.amount = pos.amount.minus(actual);
//   pos.unstakedAt = event.block.timestamp;
//   let becameInactive = false;
//   if (pos.amount.equals(ZERO)) {
//     pos.active = false;
//     becameInactive = true;
//   }
//   pos.save();

//   // Protocol
//   let protocol = getProtocol();
//   protocol.totalStaked = protocol.totalStaked.minus(actual);
//   if (becameInactive)
//     protocol.totalActiveStakers = protocol.totalActiveStakers.minus(ONE);
//   updateProtocolTVL(protocol);
//   protocol.save();

//   // Staking stats
//   let stats = getStakingStats();
//   stats.totalStaked = stats.totalStaked.minus(actual);

//   if (pos.lockOption == 0) {
//     stats.flexStaked = stats.flexStaked.minus(actual);
//     if (becameInactive && stats.flexStakers > 0) stats.flexStakers -= 1;
//   } else if (pos.lockOption == 1) {
//     stats.days30Staked = stats.days30Staked.minus(actual);
//     if (becameInactive && stats.days30Stakers > 0) stats.days30Stakers -= 1;
//   } else if (pos.lockOption == 2) {
//     stats.days90Staked = stats.days90Staked.minus(actual);
//     if (becameInactive && stats.days90Stakers > 0) stats.days90Stakers -= 1;
//   } else if (pos.lockOption == 3) {
//     stats.days180Staked = stats.days180Staked.minus(actual);
//     if (becameInactive && stats.days180Stakers > 0) stats.days180Stakers -= 1;
//   } else {
//     stats.flexStaked = stats.flexStaked.minus(actual);
//     if (becameInactive && stats.flexStakers > 0) stats.flexStakers -= 1;
//   }

//   if (becameInactive && stats.activeStakers > 0) {
//     stats.activeStakers -= 1;
//   }
//   stats.save();

//   // Keep protocol.totalActiveStakers in sync with stats.activeStakers
//   protocol.totalActiveStakers = BigInt.fromI32(stats.activeStakers);
//   protocol.save();

//   // User
//   let user = getOrCreateUser(
//     event.params.user,
//     event.block.number,
//     event.block.timestamp,
//   );
//   user.totalUnstaked = user.totalUnstaked.plus(actual);
//   if (becameInactive) {
//     user.hasActiveStake = false;
//     user.stakingPosition = null;
//   }
//   user.save();

//   // Immutable event
//   let se = new StakingEvent(txId(event.transaction.hash, event.logIndex));
//   se.user = event.params.user;
//   se.type = "UNSTAKE";
//   se.amount = actual;
//   se.lockOption = pos.lockOption;
//   se.unlockTime = pos.unlockTime;
//   se.timestamp = event.block.timestamp;
//   se.blockNumber = event.block.number;
//   se.transactionHash = event.transaction.hash;
//   se.save();

//   // time-series
//   let day = getOrCreateDaily(event.block.timestamp);
//   day.unstakingVolume = day.unstakingVolume.plus(actual);
//   day.totalTransactions = day.totalTransactions + 1;
//   day.save();

//   let w = getOrCreateWeekly(event.block.timestamp);
//   w.unstakingVolume = w.unstakingVolume.plus(actual);
//   w.totalTransactions = w.totalTransactions + 1;
//   w.save();

//   let m = getOrCreateMonthly(event.block.timestamp);
//   m.unstakingVolume = m.unstakingVolume.plus(actual);
//   m.totalTransactions = m.totalTransactions + 1;
//   m.save();

//   let y = getOrCreateYearly(event.block.timestamp);
//   y.unstakingVolume = y.unstakingVolume.plus(actual);
//   y.totalTransactions = y.totalTransactions + 1;
//   y.save();

//   markDailyActivity(
//     event.params.user,
//     event.block.timestamp,
//     false,
//     true,
//     false,
//   );
// }

// export function handleRewardClaimed(event: RewardClaimed): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);

//   let user = event.params.user;
//   let amount = event.params.reward;

//   let posId = user.toHexString();
//   let pos = StakingPosition.load(posId);
//   if (pos != null) {
//     pos.lastClaimTime = event.block.timestamp;
//     pos.totalRewardsClaimed = pos.totalRewardsClaimed.plus(amount);
//     pos.save();
//   }

//   let u = getOrCreateUser(user, event.block.number, event.block.timestamp);
//   u.totalRewardsClaimed = u.totalRewardsClaimed.plus(amount);
//   u.save();

//   let protocol = getProtocol();
//   protocol.totalRewardsDistributed =
//     protocol.totalRewardsDistributed.plus(amount);
//   if (protocol.availableRewards.gt(amount)) {
//     protocol.availableRewards = protocol.availableRewards.minus(amount);
//   } else {
//     protocol.availableRewards = ZERO;
//   }
//   protocol.save();

//   let stats = getStakingStats();
//   stats.totalRewardsDistributed = stats.totalRewardsDistributed.plus(amount);
//   if (stats.availableRewards.gt(amount)) {
//     stats.availableRewards = stats.availableRewards.minus(amount);
//   } else {
//     stats.availableRewards = ZERO;
//   }
//   stats.save();

//   let se = new StakingEvent(txId(event.transaction.hash, event.logIndex));
//   se.user = user;
//   se.type = "CLAIM";
//   se.amount = amount;
//   se.timestamp = event.block.timestamp;
//   se.blockNumber = event.block.number;
//   se.transactionHash = event.transaction.hash;
//   se.save();

//   let day = getOrCreateDaily(event.block.timestamp);
//   day.rewardsClaimed = day.rewardsClaimed.plus(amount);
//   day.totalTransactions = day.totalTransactions + 1;
//   day.save();

//   let w = getOrCreateWeekly(event.block.timestamp);
//   w.rewardsClaimed = w.rewardsClaimed.plus(amount);
//   w.totalTransactions = w.totalTransactions + 1;
//   w.save();

//   let m = getOrCreateMonthly(event.block.timestamp);
//   m.rewardsClaimed = m.rewardsClaimed.plus(amount);
//   m.totalTransactions = m.totalTransactions + 1;
//   m.save();

//   let y = getOrCreateYearly(event.block.timestamp);
//   y.rewardsClaimed = y.rewardsClaimed.plus(amount);
//   y.totalTransactions = y.totalTransactions + 1;
//   y.save();

//   markDailyActivity(user, event.block.timestamp, false, false, true);
// }

// export function handleCompounded(event: Compounded): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);

//   let user = event.params.user;
//   let amount = event.params.rewardAdded;

//   let posId = user.toHexString();
//   let pos = StakingPosition.load(posId);
//   if (pos == null) return;

//   pos.amount = pos.amount.plus(amount);
//   pos.lastClaimTime = event.block.timestamp;
//   pos.totalRewardsCompounded = pos.totalRewardsCompounded.plus(amount);
//   pos.save();

//   let u = getOrCreateUser(user, event.block.number, event.block.timestamp);
//   u.totalRewardsCompounded = u.totalRewardsCompounded.plus(amount);
//   u.totalStaked = u.totalStaked.plus(amount);
//   u.save();

//   let protocol = getProtocol();
//   protocol.totalRewardsDistributed =
//     protocol.totalRewardsDistributed.plus(amount);
//   protocol.totalStaked = protocol.totalStaked.plus(amount);
//   if (protocol.availableRewards.gt(amount)) {
//     protocol.availableRewards = protocol.availableRewards.minus(amount);
//   } else {
//     protocol.availableRewards = ZERO;
//   }
//   updateProtocolTVL(protocol);
//   protocol.save();

//   let stats = getStakingStats();
//   stats.totalRewardsDistributed = stats.totalRewardsDistributed.plus(amount);
//   stats.totalStaked = stats.totalStaked.plus(amount);

//   if (pos.lockOption == 0) {
//     stats.flexStaked = stats.flexStaked.plus(amount);
//   } else if (pos.lockOption == 1) {
//     stats.days30Staked = stats.days30Staked.plus(amount);
//   } else if (pos.lockOption == 2) {
//     stats.days90Staked = stats.days90Staked.plus(amount);
//   } else if (pos.lockOption == 3) {
//     stats.days180Staked = stats.days180Staked.plus(amount);
//   } else {
//     stats.flexStaked = stats.flexStaked.plus(amount);
//   }

//   if (stats.availableRewards.gt(amount)) {
//     stats.availableRewards = stats.availableRewards.minus(amount);
//   } else {
//     stats.availableRewards = ZERO;
//   }
//   stats.save();

//   let se = new StakingEvent(txId(event.transaction.hash, event.logIndex));
//   se.user = user;
//   se.type = "COMPOUND";
//   se.amount = amount;
//   se.lockOption = pos.lockOption;
//   se.unlockTime = pos.unlockTime;
//   se.timestamp = event.block.timestamp;
//   se.blockNumber = event.block.number;
//   se.transactionHash = event.transaction.hash;
//   se.save();

//   let day = getOrCreateDaily(event.block.timestamp);
//   day.rewardsClaimed = day.rewardsClaimed.plus(amount);
//   day.stakingVolume = day.stakingVolume.plus(amount);
//   day.totalTransactions = day.totalTransactions + 1;
//   day.save();

//   let w = getOrCreateWeekly(event.block.timestamp);
//   w.rewardsClaimed = w.rewardsClaimed.plus(amount);
//   w.stakingVolume = w.stakingVolume.plus(amount);
//   w.totalTransactions = w.totalTransactions + 1;
//   w.save();

//   let m = getOrCreateMonthly(event.block.timestamp);
//   m.rewardsClaimed = m.rewardsClaimed.plus(amount);
//   m.stakingVolume = m.stakingVolume.plus(amount);
//   m.totalTransactions = m.totalTransactions + 1;
//   m.save();

//   let y = getOrCreateYearly(event.block.timestamp);
//   y.rewardsClaimed = y.rewardsClaimed.plus(amount);
//   y.stakingVolume = y.stakingVolume.plus(amount);
//   y.totalTransactions = y.totalTransactions + 1;
//   y.save();

//   markDailyActivity(user, event.block.timestamp, false, false, true);
// }

// export function handleRewardsDeposited(event: RewardsDeposited): void {
//   trackTx(event.transaction.hash, event.block.number, event.block.timestamp);

//   let from = event.params.from;
//   let amount = event.params.amount;

//   let protocol = getProtocol();
//   protocol.totalRewardsDeposited = protocol.totalRewardsDeposited.plus(amount);
//   protocol.availableRewards = protocol.availableRewards.plus(amount);
//   protocol.save();

//   let stats = getStakingStats();
//   stats.totalRewardsDeposited = stats.totalRewardsDeposited.plus(amount);
//   stats.availableRewards = stats.availableRewards.plus(amount);
//   stats.save();

//   // time-series: count this as a transaction
//   let day = getOrCreateDaily(event.block.timestamp);
//   day.totalTransactions = day.totalTransactions + 1;
//   day.save();

//   let w = getOrCreateWeekly(event.block.timestamp);
//   w.totalTransactions = w.totalTransactions + 1;
//   w.save();

//   let m = getOrCreateMonthly(event.block.timestamp);
//   m.totalTransactions = m.totalTransactions + 1;
//   m.save();

//   let y = getOrCreateYearly(event.block.timestamp);
//   y.totalTransactions = y.totalTransactions + 1;
//   y.save();
// }






import {
    Transfer,
    RoleGranted,
    RoleRevoked,
} from "../../generated/CAPX/CAPX";

import {
    VestingCreated,
    TokensClaimed,
    VestingRevoked
} from "../../generated/CAPXVesting/CAPXVesting";

import {
    Staked,
    Unstaked,
    RewardClaimed,
    RewardsDeposited,
    Compounded
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
    Transaction
} from "../../generated/schema";

import {
    Address,
    BigInt,
    BigDecimal,
    ethereum
} from "@graphprotocol/graph-ts";

/* ======================================================
   CONSTANTS
====================================================== */

const PROTOCOL_ID = "CAPX";
const ZERO = BigInt.zero();
const ONE = BigInt.fromI32(1);
const DECIMALS = BigDecimal.fromString("1000000000000000000");

/* ======================================================
   TIME HELPERS
====================================================== */

function dayIndex(ts: BigInt): string {
    return ts.toI64() / 86400 + "";
}

function weekIndex(ts: BigInt): string {
    return ts.toI64() / 604800 + "";
}

function monthIndex(ts: BigInt): string {
    return ts.toI64() / 2592000 + "";
}

function yearIndex(ts: BigInt): string {
    return ts.toI64() / 31536000 + "";
}

/* ======================================================
   PROTOCOL
====================================================== */

function getProtocol(event: ethereum.Event): Protocol {
    let p = Protocol.load(PROTOCOL_ID);
    if (p == null) {
        p = new Protocol(PROTOCOL_ID);
        p.totalUsers = ZERO;
        p.totalTransactions = ZERO;

        p.totalStakedRaw = ZERO;
        p.totalVestedRaw = ZERO;
        p.totalTVLRaw = ZERO;

        p.totalRewardsDistributedRaw = ZERO;
        p.totalVestingAllocatedRaw = ZERO;
        p.totalVestingClaimedRaw = ZERO;

        p.circulatingSupplyRaw = ZERO;
        p.totalBurnedRaw = ZERO;

        p.lastUpdateBlock = event.block.number;
        p.lastUpdateTimestamp = event.block.timestamp;
        p.save();
    }
    return p;
}

/* ======================================================
   USERS
====================================================== */

function getOrCreateUser(
    address: Address,
    event: ethereum.Event
): User {
    let id = address.toHexString();
    let u = User.load(id);

    if (u == null) {
        u = new User(id);
        u.address = address;
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

        let p = getProtocol(event);
        p.totalUsers = p.totalUsers.plus(ONE);
        p.save();
    }

    return u;
}

/* ======================================================
   TRANSACTION TRACKING
====================================================== */

function trackTx(event: ethereum.Event): void {
    let tx = new Transaction(event.transaction.hash.toHex());
    tx.blockNumber = event.block.number;
    tx.timestamp = event.block.timestamp;
    tx.save();

    let p = getProtocol(event);
    p.totalTransactions = p.totalTransactions.plus(ONE);
    p.lastUpdateBlock = event.block.number;
    p.lastUpdateTimestamp = event.block.timestamp;
    p.save();
}

/* ======================================================
   TRANSFERS (SUPPLY SAFE)
====================================================== */

export function handleTransfer(event: Transfer): void {
    trackTx(event);

    if (event.params.from != Address.zero()) {
        let from = getOrCreateUser(event.params.from, event);
        from.txCount = from.txCount.plus(ONE);
        from.lastActivityTimestamp = event.block.timestamp;
        from.save();
    }

    let to = getOrCreateUser(event.params.to, event);
    to.txCount = to.txCount.plus(ONE);
    to.lastActivityTimestamp = event.block.timestamp;
    to.save();
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
    v.endTime = event.params.vestingEnd;

    v.revoked = false;
    v.active = true;

    v.createdAt = event.block.timestamp;
    v.createdAtBlock = event.block.number;

    v.save();

    let p = getProtocol(event);
    p.totalVestingAllocatedRaw =
        p.totalVestingAllocatedRaw.plus(event.params.totalAllocation);
    p.totalVestedRaw =
        p.totalVestedRaw.plus(event.params.totalAllocation);
    p.totalTVLRaw =
        p.totalStakedRaw.plus(p.totalVestedRaw);
    p.save();

    user.hasActiveVesting = true;
    user.totalVestingAllocatedRaw =
        user.totalVestingAllocatedRaw.plus(event.params.totalAllocation);
    user.save();
}

export function handleTokensClaimed(event: TokensClaimed): void {
    trackTx(event);

    let p = getProtocol(event);

    let claimed = event.params.amount;
    p.totalVestingClaimedRaw =
        p.totalVestingClaimedRaw.plus(claimed);
    p.totalVestedRaw =
        p.totalVestedRaw.minus(claimed);
    p.totalTVLRaw =
        p.totalStakedRaw.plus(p.totalVestedRaw);
    p.save();

    let user = getOrCreateUser(event.params.beneficiary, event);
    user.totalVestingClaimedRaw =
        user.totalVestingClaimedRaw.plus(claimed);
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

    let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
    let s = new StakingPosition(id);

    s.user = user.id;
    s.userAddress = event.params.user;
    s.amountRaw = event.params.amount;
    s.amount = event.params.amount.toBigDecimal().div(DECIMALS);

    s.lockOption = event.params.lockOption;
    s.unlockTime = event.params.unlockTime;
    s.active = true;

    s.totalRewardsClaimedRaw = ZERO;
    s.totalRewardsClaimed = BigDecimal.zero();

    s.stakedAt = event.block.timestamp;
    s.stakedAtBlock = event.block.number;

    s.save();

    let p = getProtocol(event);
    p.totalStakedRaw =
        p.totalStakedRaw.plus(event.params.amount);
    p.totalTVLRaw =
        p.totalStakedRaw.plus(p.totalVestedRaw);
    p.save();

    user.hasActiveStake = true;
    user.totalStakedRaw =
        user.totalStakedRaw.plus(event.params.amount);
    user.save();
}

export function handleUnstaked(event: Unstaked): void {
    trackTx(event);

    let p = getProtocol(event);
    p.totalStakedRaw =
        p.totalStakedRaw.minus(event.params.amount);
    p.totalTVLRaw =
        p.totalStakedRaw.plus(p.totalVestedRaw);
    p.save();

    let user = getOrCreateUser(event.params.user, event);
    user.totalUnstakedRaw =
        user.totalUnstakedRaw.plus(event.params.amount);
    user.hasActiveStake = false;
    user.save();
}

export function handleRewardClaimed(event: RewardClaimed): void {
    trackTx(event);

    let p = getProtocol(event);
    p.totalRewardsDistributedRaw =
        p.totalRewardsDistributedRaw.plus(event.params.reward);
    p.save();

    let user = getOrCreateUser(event.params.user, event);
    user.totalRewardsClaimedRaw =
        user.totalRewardsClaimedRaw.plus(event.params.reward);
    user.totalRewardsClaimed =
        user.totalRewardsClaimedRaw.toBigDecimal().div(DECIMALS);
    user.save();
}

export function handleCompounded(event: Compounded): void {
    trackTx(event);

    let p = getProtocol(event);
    p.totalStakedRaw =
        p.totalStakedRaw.plus(event.params.rewardAdded);
    p.totalTVLRaw =
        p.totalStakedRaw.plus(p.totalVestedRaw);
    p.save();
}
