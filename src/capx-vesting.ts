import {
  OwnershipTransferred as OwnershipTransferredEvent,
  Paused as PausedEvent,
  TokensClaimed as TokensClaimedEvent,
  Unpaused as UnpausedEvent,
  VestingCreated as VestingCreatedEvent,
  VestingRevoked as VestingRevokedEvent,
} from "../generated/CAPXVesting/CAPXVesting"
import {
  OwnershipTransferred,
  Paused,
  TokensClaimed,
  Unpaused,
  VestingCreated,
  VestingRevoked,
} from "../generated/schema"

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent,
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePaused(event: PausedEvent): void {
  let entity = new Paused(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.account = event.params.account

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTokensClaimed(event: TokensClaimedEvent): void {
  let entity = new TokensClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.beneficiary = event.params.beneficiary
  entity.amount = event.params.amount
  entity.totalClaimed = event.params.totalClaimed

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUnpaused(event: UnpausedEvent): void {
  let entity = new Unpaused(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.account = event.params.account

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleVestingCreated(event: VestingCreatedEvent): void {
  let entity = new VestingCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.beneficiary = event.params.beneficiary
  entity.totalAllocation = event.params.totalAllocation
  entity.startTime = event.params.startTime
  entity.cliffEnd = event.params.cliffEnd
  entity.vestingEnd = event.params.vestingEnd

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleVestingRevoked(event: VestingRevokedEvent): void {
  let entity = new VestingRevoked(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.beneficiary = event.params.beneficiary
  entity.amountClaimed = event.params.amountClaimed
  entity.amountRevoked = event.params.amountRevoked

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
