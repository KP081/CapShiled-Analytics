import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  OwnershipTransferred,
  Paused,
  TokensClaimed,
  Unpaused,
  VestingCreated,
  VestingRevoked
} from "../generated/CAPXVesting/CAPXVesting"

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPausedEvent(account: Address): Paused {
  let pausedEvent = changetype<Paused>(newMockEvent())

  pausedEvent.parameters = new Array()

  pausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return pausedEvent
}

export function createTokensClaimedEvent(
  beneficiary: Address,
  amount: BigInt,
  totalClaimed: BigInt
): TokensClaimed {
  let tokensClaimedEvent = changetype<TokensClaimed>(newMockEvent())

  tokensClaimedEvent.parameters = new Array()

  tokensClaimedEvent.parameters.push(
    new ethereum.EventParam(
      "beneficiary",
      ethereum.Value.fromAddress(beneficiary)
    )
  )
  tokensClaimedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  tokensClaimedEvent.parameters.push(
    new ethereum.EventParam(
      "totalClaimed",
      ethereum.Value.fromUnsignedBigInt(totalClaimed)
    )
  )

  return tokensClaimedEvent
}

export function createUnpausedEvent(account: Address): Unpaused {
  let unpausedEvent = changetype<Unpaused>(newMockEvent())

  unpausedEvent.parameters = new Array()

  unpausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return unpausedEvent
}

export function createVestingCreatedEvent(
  beneficiary: Address,
  totalAllocation: BigInt,
  startTime: BigInt,
  cliffEnd: BigInt,
  vestingEnd: BigInt
): VestingCreated {
  let vestingCreatedEvent = changetype<VestingCreated>(newMockEvent())

  vestingCreatedEvent.parameters = new Array()

  vestingCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "beneficiary",
      ethereum.Value.fromAddress(beneficiary)
    )
  )
  vestingCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "totalAllocation",
      ethereum.Value.fromUnsignedBigInt(totalAllocation)
    )
  )
  vestingCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "startTime",
      ethereum.Value.fromUnsignedBigInt(startTime)
    )
  )
  vestingCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "cliffEnd",
      ethereum.Value.fromUnsignedBigInt(cliffEnd)
    )
  )
  vestingCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "vestingEnd",
      ethereum.Value.fromUnsignedBigInt(vestingEnd)
    )
  )

  return vestingCreatedEvent
}

export function createVestingRevokedEvent(
  beneficiary: Address,
  amountClaimed: BigInt,
  amountRevoked: BigInt
): VestingRevoked {
  let vestingRevokedEvent = changetype<VestingRevoked>(newMockEvent())

  vestingRevokedEvent.parameters = new Array()

  vestingRevokedEvent.parameters.push(
    new ethereum.EventParam(
      "beneficiary",
      ethereum.Value.fromAddress(beneficiary)
    )
  )
  vestingRevokedEvent.parameters.push(
    new ethereum.EventParam(
      "amountClaimed",
      ethereum.Value.fromUnsignedBigInt(amountClaimed)
    )
  )
  vestingRevokedEvent.parameters.push(
    new ethereum.EventParam(
      "amountRevoked",
      ethereum.Value.fromUnsignedBigInt(amountRevoked)
    )
  )

  return vestingRevokedEvent
}
