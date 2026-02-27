import * as AddressModel from '../models/AddressModel.js';

/**
 * Create a new address
 */
export async function create(req, res) {
  const { address, label } = req.body;
  const user_id = req.user_id; // From authenticate middleware

  console.log(`User ${user_id} creating address: ${address}`);

  if (!address) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Address is required'
    });
  }

  // Validation:  ETH address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid Ethereum address format'
    });
  }

  try {
    const newAddress = await AddressModel.create(user_id, address, label || null);
    console.log(`Address created with ID: ${newAddress.id}`);
    return res.status(201).json(newAddress);
  } catch (error) {
    // Handle duplicate address (unique constraint violation)
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'You are already tracking this address'
      });
    }
    throw error;
  }
}


export async function list(req, res) {
  const user_id = req.user_id; // From authenticate middleware
  
  console.log(`User ${user_id} listing addresses`);
  
  const addresses = await AddressModel.listByUser(user_id);
  
  console.log(`Found ${addresses.length} addresses for user`);
  
  return res.json(addresses);
}

export async function remove(req, res) {
  const addressId = parseInt(req.params.addressId);
  const user_id = req.user_id; // From authenticate middleware

  console.log(`User ${user_id} deleting address ID: ${addressId}`);

  if (isNaN(addressId)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid address ID'
    });
  }

  const deleted = await AddressModel.remove(addressId, user_id);

  if (!deleted) {
    console.log(`Address ${addressId} not found or not owned by user`);
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Address not found'
    });
  }

  console.log(`Address ${addressId} deleted`);
  return res.status(204).send();
}

