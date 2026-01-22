import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  Approval,
  DAOAddressUpdated,
  ExemptionUpdated,
  Paused,
  RevenueMint,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  Transfer,
  TreasuryAddressUpdated,
  TreasuryFee,
  Unpaused
} from "../generated/CAPX/CAPX"

export function createApprovalEvent(
  owner: Address,
  spender: Address,
  value: BigInt
): Approval {
  let approvalEvent = changetype<Approval>(newMockEvent())

  approvalEvent.parameters = new Array()

  approvalEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam("spender", ethereum.Value.fromAddress(spender))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  )

  return approvalEvent
}

export function createDAOAddressUpdatedEvent(
  oldAddress: Address,
  newAddress: Address
): DAOAddressUpdated {
  let daoAddressUpdatedEvent = changetype<DAOAddressUpdated>(newMockEvent())

  daoAddressUpdatedEvent.parameters = new Array()

  daoAddressUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "oldAddress",
      ethereum.Value.fromAddress(oldAddress)
    )
  )
  daoAddressUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newAddress",
      ethereum.Value.fromAddress(newAddress)
    )
  )

  return daoAddressUpdatedEvent
}

export function createExemptionUpdatedEvent(
  account: Address,
  isExempt: boolean
): ExemptionUpdated {
  let exemptionUpdatedEvent = changetype<ExemptionUpdated>(newMockEvent())

  exemptionUpdatedEvent.parameters = new Array()

  exemptionUpdatedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  exemptionUpdatedEvent.parameters.push(
    new ethereum.EventParam("isExempt", ethereum.Value.fromBoolean(isExempt))
  )

  return exemptionUpdatedEvent
}

export function createPausedEvent(account: Address): Paused {
  let pausedEvent = changetype<Paused>(newMockEvent())

  pausedEvent.parameters = new Array()

  pausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return pausedEvent
}

export function createRevenueMintEvent(
  to: Address,
  amount: BigInt,
  revenue: BigInt,
  marketValue: BigInt
): RevenueMint {
  let revenueMintEvent = changetype<RevenueMint>(newMockEvent())

  revenueMintEvent.parameters = new Array()

  revenueMintEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  revenueMintEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  revenueMintEvent.parameters.push(
    new ethereum.EventParam(
      "revenue",
      ethereum.Value.fromUnsignedBigInt(revenue)
    )
  )
  revenueMintEvent.parameters.push(
    new ethereum.EventParam(
      "marketValue",
      ethereum.Value.fromUnsignedBigInt(marketValue)
    )
  )

  return revenueMintEvent
}

export function createRoleAdminChangedEvent(
  role: Bytes,
  previousAdminRole: Bytes,
  newAdminRole: Bytes
): RoleAdminChanged {
  let roleAdminChangedEvent = changetype<RoleAdminChanged>(newMockEvent())

  roleAdminChangedEvent.parameters = new Array()

  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      "previousAdminRole",
      ethereum.Value.fromFixedBytes(previousAdminRole)
    )
  )
  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      "newAdminRole",
      ethereum.Value.fromFixedBytes(newAdminRole)
    )
  )

  return roleAdminChangedEvent
}

export function createRoleGrantedEvent(
  role: Bytes,
  account: Address,
  sender: Address
): RoleGranted {
  let roleGrantedEvent = changetype<RoleGranted>(newMockEvent())

  roleGrantedEvent.parameters = new Array()

  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )

  return roleGrantedEvent
}

export function createRoleRevokedEvent(
  role: Bytes,
  account: Address,
  sender: Address
): RoleRevoked {
  let roleRevokedEvent = changetype<RoleRevoked>(newMockEvent())

  roleRevokedEvent.parameters = new Array()

  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )

  return roleRevokedEvent
}

export function createTransferEvent(
  from: Address,
  to: Address,
  value: BigInt
): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent())

  transferEvent.parameters = new Array()

  transferEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  )

  return transferEvent
}

export function createTreasuryAddressUpdatedEvent(
  oldAddress: Address,
  newAddress: Address
): TreasuryAddressUpdated {
  let treasuryAddressUpdatedEvent =
    changetype<TreasuryAddressUpdated>(newMockEvent())

  treasuryAddressUpdatedEvent.parameters = new Array()

  treasuryAddressUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "oldAddress",
      ethereum.Value.fromAddress(oldAddress)
    )
  )
  treasuryAddressUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newAddress",
      ethereum.Value.fromAddress(newAddress)
    )
  )

  return treasuryAddressUpdatedEvent
}

export function createTreasuryFeeEvent(
  from: Address,
  to: Address,
  amount: BigInt
): TreasuryFee {
  let treasuryFeeEvent = changetype<TreasuryFee>(newMockEvent())

  treasuryFeeEvent.parameters = new Array()

  treasuryFeeEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  treasuryFeeEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  treasuryFeeEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return treasuryFeeEvent
}

export function createUnpausedEvent(account: Address): Unpaused {
  let unpausedEvent = changetype<Unpaused>(newMockEvent())

  unpausedEvent.parameters = new Array()

  unpausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return unpausedEvent
}
